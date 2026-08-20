import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Keep the first catalogue intentionally focused on shared navigation and
// account chrome. Feature copy moves here as each surface is touched instead
// of adding a second, ad-hoc translation mechanism.
const resources = {
  en: {
    translation: {
      nav: {
        dashboard: "Dashboard", feed: "Feed", search: "Search", spaces: "Spaces",
        learn: "Learn", activity: "Activity", messages: "Messages", autopilot: "Autopilot",
        earnings: "Earnings", raven: "Raven", profile: "Profile", admin: "Admin",
        share: "Share", more: "More", logOut: "Log out",
      },
      page: { creatorEarnings: "Creator Earnings" },
      auth: { signIn: "Sign in", logIn: "Log In", emailOrHandle: "Email or handle", password: "Password", forgotPassword: "Forgot password?", newToVylapp: "New to Vylapp?", createAccount: "Create an account", welcomeBack: "Welcome back", fillAllFields: "Please fill in all fields", invalidCredentials: "Invalid credentials" },
    },
  },
  ar: {
    translation: {
      nav: {
        dashboard: "لوحة التحكم", feed: "المنشورات", search: "بحث", spaces: "المساحات",
        learn: "تعلّم", activity: "النشاط", messages: "الرسائل", autopilot: "النشر التلقائي",
        earnings: "الأرباح", raven: "رافن", profile: "الملف الشخصي", admin: "الإدارة",
        share: "مشاركة", more: "المزيد", logOut: "تسجيل الخروج",
      },
      page: { creatorEarnings: "أرباح المبدع" },
      auth: { signIn: "تسجيل الدخول", logIn: "دخول", emailOrHandle: "البريد الإلكتروني أو المعرّف", password: "كلمة المرور", forgotPassword: "هل نسيت كلمة المرور؟", newToVylapp: "هل أنت جديد في فايلاب؟", createAccount: "إنشاء حساب", welcomeBack: "مرحباً بعودتك", fillAllFields: "يرجى ملء جميع الحقول", invalidCredentials: "بيانات الدخول غير صحيحة" },
    },
  },
  am: {
    translation: {
      nav: {
        dashboard: "ዳሽቦርድ", feed: "ምግብ", search: "ፍለጋ", spaces: "ስፔሶች",
        learn: "ተማር", activity: "እንቅስቃሴ", messages: "መልዕክቶች", autopilot: "ራስ-ሰር",
        earnings: "ገቢዎች", raven: "ሬቨን", profile: "መገለጫ", admin: "አስተዳደር",
        share: "አጋራ", more: "ተጨማሪ", logOut: "ውጣ",
      },
      page: { creatorEarnings: "የፈጣሪ ገቢዎች" },
      auth: { signIn: "ግባ", logIn: "ግባ", emailOrHandle: "ኢሜይል ወይም መለያ", password: "የይለፍ ቃል", forgotPassword: "የይለፍ ቃል ረሱ?", newToVylapp: "ለVylapp አዲስ ነዎት?", createAccount: "መለያ ይፍጠሩ", welcomeBack: "እንኳን ደህና መጡ", fillAllFields: "እባክዎ ሁሉንም መስኮች ይሙሉ", invalidCredentials: "የመግቢያ መረጃ ትክክል አይደለም" },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("vyl_lang") || "en",
    fallbackLng: "en",
    supportedLngs: Object.keys(resources),
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
