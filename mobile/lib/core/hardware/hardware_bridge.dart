import 'dart:async';
import 'package:flutter/services.dart';
import 'package:injectable/injectable.dart';

/// Hardware communication bridge.
///
/// Flutter communicates with native Android (Kotlin) and iOS (Swift) code
/// via platform channels. This service defines the channel contracts so
/// that hardware features — BLE, NFC, USB, biometrics, camera — can be
/// implemented natively without going through a plugin intermediary.
///
/// WHY NATIVE INSTEAD OF PURE DART PLUGINS?
/// Plugins wrap the OS APIs. For production hardware integration where
/// latency, reliability, or vendor-specific behaviour matters, you often
/// need to talk to the native API directly. Examples:
///   - A custom BLE sensor with a proprietary GATT profile
///   - A USB device that only exposes a vendor-specific driver on Android
///   - An NFC hardware token that requires iOS-specific NDEF handling
///   - A biometric device connected over Bluetooth to a tablet kiosk
///
/// The pattern here: define the channel name and method/event signatures
/// in Dart, then implement them in Kotlin (Android) and Swift (iOS).
/// See /android/... and /ios/... for the native implementations.
@lazySingleton
class HardwareBridge {

  // ── Channel definitions ────────────────────────────────────────────────────
  /// Method channel: request/response calls (Dart calls native, gets a result)
  static const _methodChannel = MethodChannel('com.vylapp/hardware');

  /// Event channel: streaming data from native to Dart (sensor readings, BLE packets)
  static const _bleEventChannel    = EventChannel('com.vylapp/ble_events');
  static const _nfcEventChannel    = EventChannel('com.vylapp/nfc_events');
  static const _usbEventChannel    = EventChannel('com.vylapp/usb_events');

  // ── BLE (Bluetooth Low Energy) ─────────────────────────────────────────────
  /// Start scanning for BLE peripherals matching optional service UUIDs.
  /// Results stream via [bleDeviceStream].
  Future<void> startBleScan({List<String>? serviceUuids}) async {
    await _methodChannel.invokeMethod('ble_scan_start', {
      'serviceUuids': serviceUuids ?? [],
    });
  }

  Future<void> stopBleScan() async {
    await _methodChannel.invokeMethod('ble_scan_stop');
  }

  /// Connect to a BLE peripheral by MAC address (Android) or UUID (iOS).
  Future<bool> bleConnect(String deviceId) async {
    final result = await _methodChannel.invokeMethod<bool>('ble_connect', {
      'deviceId': deviceId,
    });
    return result ?? false;
  }

  Future<void> bleDisconnect(String deviceId) async {
    await _methodChannel.invokeMethod('ble_disconnect', {'deviceId': deviceId});
  }

  /// Read a GATT characteristic by service UUID and characteristic UUID.
  Future<List<int>> bleReadCharacteristic({
    required String deviceId,
    required String serviceUuid,
    required String characteristicUuid,
  }) async {
    final result = await _methodChannel.invokeMethod<List<dynamic>>(
      'ble_read_characteristic', {
        'deviceId':             deviceId,
        'serviceUuid':          serviceUuid,
        'characteristicUuid':   characteristicUuid,
      },
    );
    return result?.map((e) => e as int).toList() ?? [];
  }

  /// Write to a GATT characteristic (with or without response).
  Future<void> bleWriteCharacteristic({
    required String   deviceId,
    required String   serviceUuid,
    required String   characteristicUuid,
    required List<int> data,
    bool withResponse = true,
  }) async {
    await _methodChannel.invokeMethod('ble_write_characteristic', {
      'deviceId':           deviceId,
      'serviceUuid':        serviceUuid,
      'characteristicUuid': characteristicUuid,
      'data':               data,
      'withResponse':       withResponse,
    });
  }

  /// Stream of BLE events: scan results, connection state changes, GATT notifications.
  Stream<BleEvent> get bleEventStream => _bleEventChannel
    .receiveBroadcastStream()
    .map((event) => BleEvent.fromMap(event as Map));

  // ── NFC ───────────────────────────────────────────────────────────────────
  /// Start NFC reading session. On iOS this shows the system NFC sheet.
  Future<void> startNfcSession({String? alertMessage}) async {
    await _methodChannel.invokeMethod('nfc_start_session', {
      'alertMessage': alertMessage ?? 'Hold your device near the tag',
    });
  }

  Future<void> stopNfcSession() async {
    await _methodChannel.invokeMethod('nfc_stop_session');
  }

  /// Write an NDEF record to an NFC tag.
  Future<bool> writeNdefRecord({required String text, String locale = 'en'}) async {
    final result = await _methodChannel.invokeMethod<bool>('nfc_write_ndef', {
      'text':   text,
      'locale': locale,
    });
    return result ?? false;
  }

  /// Stream of NFC events: tag discovered, NDEF read, error.
  Stream<NfcEvent> get nfcEventStream => _nfcEventChannel
    .receiveBroadcastStream()
    .map((event) => NfcEvent.fromMap(event as Map));

  // ── USB Serial ────────────────────────────────────────────────────────────
  /// List connected USB serial devices.
  Future<List<UsbDevice>> listUsbDevices() async {
    final result = await _methodChannel.invokeMethod<List>('usb_list_devices');
    return (result ?? [])
      .map((e) => UsbDevice.fromMap(e as Map))
      .toList();
  }

  Future<bool> usbConnect({required int vendorId, required int productId, int baudRate = 115200}) async {
    final result = await _methodChannel.invokeMethod<bool>('usb_connect', {
      'vendorId':  vendorId,
      'productId': productId,
      'baudRate':  baudRate,
    });
    return result ?? false;
  }

  Future<void> usbWrite(List<int> data) async {
    await _methodChannel.invokeMethod('usb_write', {'data': data});
  }

  Future<void> usbDisconnect() async {
    await _methodChannel.invokeMethod('usb_disconnect');
  }

  /// Stream of USB events: data received, device attached/detached.
  Stream<UsbEvent> get usbEventStream => _usbEventChannel
    .receiveBroadcastStream()
    .map((event) => UsbEvent.fromMap(event as Map));

  // ── Device info ───────────────────────────────────────────────────────────
  Future<Map<String, dynamic>> getDeviceInfo() async {
    final result = await _methodChannel.invokeMethod<Map>('device_info');
    return Map<String, dynamic>.from(result ?? {});
  }
}

// ── Data models ───────────────────────────────────────────────────────────────
class BleEvent {
  final String type; // 'scan_result' | 'connected' | 'disconnected' | 'notification' | 'error'
  final String? deviceId;
  final String? deviceName;
  final int?    rssi;
  final List<int>? data;
  final String? error;

  const BleEvent({required this.type, this.deviceId, this.deviceName, this.rssi, this.data, this.error});

  factory BleEvent.fromMap(Map map) => BleEvent(
    type:       map['type'] as String? ?? 'unknown',
    deviceId:   map['deviceId'] as String?,
    deviceName: map['deviceName'] as String?,
    rssi:       map['rssi'] as int?,
    data:       (map['data'] as List?)?.map((e) => e as int).toList(),
    error:      map['error'] as String?,
  );
}

class NfcEvent {
  final String type; // 'tag_discovered' | 'ndef_read' | 'write_success' | 'error'
  final String? tagId;
  final String? ndefText;
  final String? error;

  const NfcEvent({required this.type, this.tagId, this.ndefText, this.error});

  factory NfcEvent.fromMap(Map map) => NfcEvent(
    type:     map['type'] as String? ?? 'unknown',
    tagId:    map['tagId'] as String?,
    ndefText: map['ndefText'] as String?,
    error:    map['error'] as String?,
  );
}

class UsbEvent {
  final String type; // 'data_received' | 'device_attached' | 'device_detached' | 'error'
  final List<int>? data;
  final int?    vendorId;
  final int?    productId;
  final String? error;

  const UsbEvent({required this.type, this.data, this.vendorId, this.productId, this.error});

  factory UsbEvent.fromMap(Map map) => UsbEvent(
    type:      map['type'] as String? ?? 'unknown',
    data:      (map['data'] as List?)?.map((e) => e as int).toList(),
    vendorId:  map['vendorId'] as int?,
    productId: map['productId'] as int?,
    error:     map['error'] as String?,
  );
}

class UsbDevice {
  final int    vendorId;
  final int    productId;
  final String deviceName;

  const UsbDevice({required this.vendorId, required this.productId, required this.deviceName});

  factory UsbDevice.fromMap(Map map) => UsbDevice(
    vendorId:   map['vendorId'] as int,
    productId:  map['productId'] as int,
    deviceName: map['deviceName'] as String? ?? 'Unknown device',
  );
}
