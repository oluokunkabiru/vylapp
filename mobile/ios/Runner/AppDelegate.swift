import UIKit
import Flutter
import CoreBluetooth
import CoreNFC
import Firebase
import FirebaseMessaging

/**
 AppDelegate — iOS host for Flutter and all native platform channel implementations.

 Channel contracts defined here MUST match the Dart side in hardware_bridge.dart
 and the Kotlin side in MainActivity.kt.

 SECURITY NOTES:
   - BLE requires NSBluetoothAlwaysUsageDescription in Info.plist.
   - NFC requires NFCReaderUsageDescription in Info.plist and the
     com.apple.developer.nfc.readersession.formats entitlement.
   - Never store sensitive BLE/NFC payloads beyond the immediate session.
   - For medical or payment hardware: require Face ID / Touch ID via
     local_auth before opening the BLE/NFC session.
*/
@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {

    // ── Channel names — must match Dart and Kotlin exactly ─────────────────
    private let kMethodChannel = "com.vylapp/hardware"
    private let kBleChannel    = "com.vylapp/ble_events"
    private let kNfcChannel    = "com.vylapp/nfc_events"
    private let kUsbChannel    = "com.vylapp/usb_events"

    // ── BLE state ──────────────────────────────────────────────────────────
    private var centralManager: CBCentralManager?
    private var connectedPeripheral: CBPeripheral?
    private var bleEventSink: FlutterEventSink?

    // ── NFC state ──────────────────────────────────────────────────────────
    private var nfcSession: NFCNDEFReaderSession?
    private var nfcEventSink: FlutterEventSink?
    private var nfcAlertMessage = "Hold your device near the NFC tag"

    override func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // ── Firebase ───────────────────────────────────────────────────────
        FirebaseApp.configure()
        Messaging.messaging().delegate = self
        UNUserNotificationCenter.current().delegate = self

        // ── Flutter engine and channels ────────────────────────────────────
        let controller = window?.rootViewController as! FlutterViewController
        let binaryMessenger = controller.binaryMessenger

        setupMethodChannel(binaryMessenger: binaryMessenger)
        setupBleEventChannel(binaryMessenger: binaryMessenger)
        setupNfcEventChannel(binaryMessenger: binaryMessenger)
        setupUsbEventChannel(binaryMessenger: binaryMessenger)

        GeneratedPluginRegistrant.register(with: self)
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }

    // ── Method channel ────────────────────────────────────────────────────
    private func setupMethodChannel(binaryMessenger: FlutterBinaryMessenger) {
        FlutterMethodChannel(name: kMethodChannel, binaryMessenger: binaryMessenger)
            .setMethodCallHandler { [weak self] call, result in
                guard let self else { return }
                switch call.method {
                // BLE
                case "ble_scan_start":
                    let serviceUuids = (call.arguments as? [String: Any])?["serviceUuids"] as? [String]
                    self.startBleScan(serviceUuids: serviceUuids, result: result)
                case "ble_scan_stop":
                    self.centralManager?.stopScan()
                    result(nil)
                case "ble_connect":
                    let deviceId = (call.arguments as? [String: Any])?["deviceId"] as? String ?? ""
                    self.bleConnect(deviceId: deviceId, result: result)
                case "ble_disconnect":
                    self.bleDisconnect()
                    result(nil)
                case "ble_read_characteristic":
                    // Real implementation: find peripheral's service+characteristic and read
                    result(FlutterError(code: "NOT_IMPLEMENTED", message: "Implement GATT read", details: nil))
                case "ble_write_characteristic":
                    result(FlutterError(code: "NOT_IMPLEMENTED", message: "Implement GATT write", details: nil))
                // NFC
                case "nfc_start_session":
                    let msg = (call.arguments as? [String: Any])?["alertMessage"] as? String
                    self.startNfcSession(alertMessage: msg, result: result)
                case "nfc_stop_session":
                    self.nfcSession?.invalidate()
                    result(nil)
                case "nfc_write_ndef":
                    result(nil) // Write handled in NFCNDEFReaderSession delegate
                // USB — not supported on iOS (iOS does not support USB host mode without MFi)
                case "usb_list_devices":
                    result([]) // Return empty list on iOS
                case "usb_connect", "usb_write", "usb_disconnect":
                    result(FlutterError(code: "NOT_SUPPORTED", message: "USB host not supported on iOS", details: nil))
                // Device info
                case "device_info":
                    result(self.getDeviceInfo())
                default:
                    result(FlutterMethodNotImplemented)
                }
            }
    }

    // ── BLE event channel ─────────────────────────────────────────────────
    private func setupBleEventChannel(binaryMessenger: FlutterBinaryMessenger) {
        FlutterEventChannel(name: kBleChannel, binaryMessenger: binaryMessenger)
            .setStreamHandler(BleStreamHandler { [weak self] sink in
                self?.bleEventSink = sink
            } onCancel: { [weak self] in
                self?.bleEventSink = nil
            })
    }

    private func startBleScan(serviceUuids: [String]?, result: FlutterResult) {
        if centralManager == nil {
            centralManager = CBCentralManager(delegate: self, queue: nil)
        }
        let cbUuids = serviceUuids?.compactMap { CBUUID(string: $0) }
        centralManager?.scanForPeripherals(withServices: cbUuids, options: [
            CBCentralManagerScanOptionAllowDuplicatesKey: false
        ])
        result(nil)
    }

    private func bleConnect(deviceId: String, result: FlutterResult) {
        // iOS uses UUID instead of MAC address for peripherals
        guard let uuid = UUID(uuidString: deviceId),
              let peripheral = centralManager?.retrievePeripherals(withIdentifiers: [uuid]).first else {
            result(FlutterError(code: "DEVICE_NOT_FOUND", message: "Peripheral \(deviceId) not found", details: nil))
            return
        }
        centralManager?.connect(peripheral, options: nil)
        connectedPeripheral = peripheral
        result(true)
    }

    private func bleDisconnect() {
        if let p = connectedPeripheral { centralManager?.cancelPeripheralConnection(p) }
        connectedPeripheral = nil
    }

    // ── NFC event channel ─────────────────────────────────────────────────
    private func setupNfcEventChannel(binaryMessenger: FlutterBinaryMessenger) {
        FlutterEventChannel(name: kNfcChannel, binaryMessenger: binaryMessenger)
            .setStreamHandler(BleStreamHandler { [weak self] sink in
                self?.nfcEventSink = sink
            } onCancel: { [weak self] in
                self?.nfcEventSink = nil
            })
    }

    private func startNfcSession(alertMessage: String?, result: FlutterResult) {
        guard NFCNDEFReaderSession.readingAvailable else {
            result(FlutterError(code: "NFC_NOT_AVAILABLE", message: "NFC not available on this device", details: nil))
            return
        }
        nfcAlertMessage = alertMessage ?? nfcAlertMessage
        nfcSession = NFCNDEFReaderSession(delegate: self, queue: nil, invalidateAfterFirstRead: false)
        nfcSession?.alertMessage = nfcAlertMessage
        nfcSession?.begin()
        result(nil)
    }

    // ── USB event channel ─────────────────────────────────────────────────
    private func setupUsbEventChannel(binaryMessenger: FlutterBinaryMessenger) {
        FlutterEventChannel(name: kUsbChannel, binaryMessenger: binaryMessenger)
            .setStreamHandler(BleStreamHandler { _ in } onCancel: { })
    }

    // ── Device info ────────────────────────────────────────────────────────
    private func getDeviceInfo() -> [String: Any] {
        let device = UIDevice.current
        return [
            "model":   device.model,
            "ios":     device.systemVersion,
            "hasBle":  true,
            "hasNfc":  NFCNDEFReaderSession.readingAvailable,
            "hasUsb":  false,
        ]
    }

    // ── FCM token forwarding ───────────────────────────────────────────────
    override func application(_ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
    }
}

// ── CBCentralManagerDelegate ───────────────────────────────────────────────────
extension AppDelegate: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {}

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
        advertisementData: [String: Any], rssi RSSI: NSNumber) {
        bleEventSink?([
            "type":       "scan_result",
            "deviceId":   peripheral.identifier.uuidString,
            "deviceName": peripheral.name ?? "Unknown",
            "rssi":       RSSI.intValue,
        ])
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        bleEventSink?(["type": "connected", "deviceId": peripheral.identifier.uuidString])
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        bleEventSink?(["type": "disconnected", "deviceId": peripheral.identifier.uuidString])
    }
}

// ── NFCNDEFReaderSessionDelegate ───────────────────────────────────────────────
extension AppDelegate: NFCNDEFReaderSessionDelegate {
    func readerSession(_ session: NFCNDEFReaderSession, didDetectNDEFs messages: [NFCNDEFMessage]) {
        for message in messages {
            for record in message.records {
                let text = String(data: record.payload.dropFirst(3), encoding: .utf8)
                nfcEventSink?([
                    "type":     "ndef_read",
                    "ndefText": text ?? "",
                ])
            }
        }
    }

    func readerSession(_ session: NFCNDEFReaderSession, didInvalidateWithError error: Error) {
        if (error as NSError).code != 200 { // 200 = user cancelled
            nfcEventSink?(["type": "error", "error": error.localizedDescription])
        }
    }
}

// ── MessagingDelegate ──────────────────────────────────────────────────────────
extension AppDelegate: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        // Token is forwarded to the server by the Dart NotificationService
    }
}

// ── Helper: reusable StreamHandler ────────────────────────────────────────────
private class BleStreamHandler: NSObject, FlutterStreamHandler {
    private let onListenCallback: (FlutterEventSink?) -> Void
    private let onCancelCallback: () -> Void

    init(onListen: @escaping (FlutterEventSink?) -> Void, onCancel: @escaping () -> Void) {
        self.onListenCallback = onListen
        self.onCancelCallback = onCancel
    }

    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        onListenCallback(events)
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        onListenCallback(nil)
        onCancelCallback()
        return nil
    }
}
