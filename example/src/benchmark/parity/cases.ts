import type { PretextStyle } from "react-native-nitro-pretext";

import type {
  ParityCase,
  ParityCaseCategory,
  ParityRnTextProps,
} from "./types";

export const PARITY_BASE_STYLE: PretextStyle = {
  fontFamily: "System",
  fontSize: 18,
  includeFontPadding: true,
  letterSpacing: 0,
  lineHeight: 28,
  locale: "",
  textDirection: "auto",
};

export const PARITY_CASE_DISTRIBUTION = {
  emoji: 35,
  indic: 30,
  japanese: 25,
  "korean-cjk": 35,
  latin: 30,
  rtl: 25,
  style: 15,
  thai: 25,
  whitespace: 20,
} satisfies Record<ParityCaseCategory, number>;

const DEFAULT_RN_TEXT_PROPS: ParityRnTextProps = {
  android_hyphenationFrequency: "none",
  lineBreakStrategyIOS: "none",
  textBreakStrategy: "highQuality",
};

const WIDTHS = [168, 184, 196, 212, 228, 244, 260, 276, 292, 308, 324, 340];

const LATIN_TEXTS = [
  "The layout engine wraps a compact product update before the card mounts.",
  "LongEnglishIdentifierWithoutSpacesForcesFallbackBreaksNearTheEdge",
  "Open https://pretext.example/docs/benchmark/parity before the next deploy.",
  "A support reply mixes short labels, dense punctuation, and a trailing note.",
  "SKU-ALPHA-2026 remains visible beside a narrow status column.",
  "Email qa-team+parity@example.com when line snapshots move unexpectedly.",
  "Invoice #PRE-240-CASE includes slashes, dots, and grouped numbers.",
  "The resize handle moves while a sentence keeps its original source order.",
  "Plain Latin words should not borrow run counts from the timing benchmark.",
  "A veryveryveryverylongword sits beside normal prose and punctuation.",
];

const KOREAN_CJK_TEXTS = [
  "회의 직전에 카드 폭이 바뀌면 문단 줄 수가 안정적으로 유지되어야 한다.",
  "한국어와 English 를 섞은 문장이 같은 폭에서 어디서 접히는지 확인한다.",
  "중요 알림: 결제 상태가 변경되었고 다음 액션을 바로 선택해야 한다.",
  "간단한 안내문 뒤에 中文字符가 이어져 fallback 폭을 함께 검증한다.",
  "가격표, 배송지, 재고 상태가 한 줄 안에서 순서대로 노출된다.",
  "사용자 메모에는 괄호(테스트), 쉼표, 마침표가 자연스럽게 들어간다.",
  "短い中文短语和한국어가 섞여도 줄 경계가 source offset과 맞아야 한다.",
  "긴 상담 답변이 좁은 카드 안에서 두세 줄로 접히는 상황이다.",
  "이 케이스는 숫자 12345 와 단위 kg, ms, px 를 같이 포함한다.",
  "상태 배지는 완료됨, 대기중, 실패 항목을 같은 문단에서 설명한다.",
];

const JAPANESE_TEXTS = [
  "カードの幅が変わる前にテキストの高さを安定させる必要があります。",
  "日本語とEnglishを混ぜた説明文が自然な位置で折り返されます。",
  "ユーザー通知には日時、場所、短い補足メモが含まれています。",
  "長い商品説明が狭い一覧セルの中で複数行に分かれます。",
  "句読点、括弧（確認用）、数字123を含む文を測定します。",
  "かなとカタカナと漢字の混在でfallbackの揺れを確認します。",
  "次の操作を案内する短い文章でも行末処理は重要です。",
  "配送状況が更新されました。詳細は注文履歴で確認できます。",
  "同じ文章を幅だけ変えても測定結果は一貫しているべきです。",
  "サンプルケースは表示レンダラーの行情報と比較されます。",
];

const THAI_TEXTS = [
  "ข้อความภาษาไทยไม่มีช่องว่างจำนวนมากและต้องตัดบรรทัดอย่างเหมาะสม",
  "รายการแจ้งเตือนนี้ผสมEnglishและตัวเลข123เพื่อทดสอบการวัด",
  "ผู้ใช้ต้องเห็นสถานะการชำระเงินก่อนที่การ์ดจะเปลี่ยนความสูง",
  "การตัดคำภาษาไทยควรสอดคล้องกับผลลัพธ์ของReactNativeText",
  "ประโยคยาวในพื้นที่แคบช่วยตรวจสอบความต่างของตัวแบ่งบรรทัด",
  "รายละเอียดสินค้าและหมายเหตุเพิ่มเติมอยู่ในข้อความเดียวกัน",
  "ระบบแสดงข้อความสำคัญพร้อมวันที่เวลาและรหัสอ้างอิง",
  "การทดสอบนี้เน้นกรณีที่ไม่มีช่องว่างระหว่างคำส่วนใหญ่",
  "ข้อความสั้นและข้อความยาวควรให้ผลลัพธ์ที่อ่านได้เหมือนกัน",
  "ตัวอย่างนี้ตรวจสอบขอบเขตบรรทัดเมื่อมีสระและวรรณยุกต์",
];

const RTL_TEXTS = [
  "تحتاج البطاقة إلى قياس النص العربي قبل أن يظهر السطح النهائي.",
  "הודעת מערכת בעברית צריכה להישבר לשורות בצורה יציבה.",
  "Arabic text with English 123 keeps bidi order near the wrap boundary.",
  "עברית עם English ומספרים 456 בודקת כיוון כתיבה אוטומטי.",
  "تقرير الحالة يحتوي على أرقام، فاصلة، ونص مختلط داخل بطاقة ضيقة.",
  "המשתמש רואה הערה קצרה ואז פירוט ארוך יותר באותו רכיב.",
  "مرحلة الاختبار تقارن أسطر React Native مع Pretext بدقة.",
  "RTL paragraph includes punctuation: مرحبا، اختبار، نهاية.",
  "טקסט ארוך יחסית עם סוגריים (בדיקה) וסימני פיסוק.",
  "يجب ألا يقطع المحرك تسلسل النص عند حدود غير متوقعة.",
];

const INDIC_TEXTS = [
  "हिन्दी वाक्य में संयुक्ताक्षर क्ष त्र ज्ञ और मात्रा चिह्न शामिल हैं।",
  "देवनागरी पाठ English 123 के साथ पंक्ति विभाजन की जाँच करता है।",
  "कन्नड़ ಪಠ್ಯ ಮತ್ತು English ಸೇರಿ ಕಿರಿದಾದ ಕಾರ್ಡ್‌ನಲ್ಲಿ ಮುರಿಯುತ್ತದೆ.",
  "বাংলা বাক্যে যুক্তাক্ষর, সংখ্যা ১২৩, এবং বিরামচিহ্ন আছে।",
  "தமிழ் உரை குறுகிய அகலத்தில் பல வரிகளாக உடைய வேண்டும்.",
  "മലയാളം വാക്യം ചില്ലക്ഷരങ്ങളും ചിഹ്നങ്ങളും ചേർത്ത് പരിശോധിക്കുന്നു.",
  "ગુજરાતી લખાણમાં સંયુક્ત અક્ષરો અને અંકો 123 સામેલ છે.",
  "తెలుగు వాక్యం సంక్లిష్ట అక్షరాలు మరియు English కలిపి ఉంటుంది.",
  "मराठी सूचना संदेशात दिनांक, वेळ, आणि क्रमांक लिहिला आहे.",
  "ਪੰਜਾਬੀ ਲਾਈਨ ਵਿੱਚ ਗੁਰਮੁਖੀ ਅੱਖਰ ਅਤੇ ਗਿਣਤੀ 123 ਸ਼ਾਮਲ ਹੈ.",
];

const EMOJI_TEXTS = [
  "Status changed 🙂 after the deploy and the card should stay stable.",
  "Family emoji 👨‍👩‍👧‍👦 sits near a wrap boundary with normal prose.",
  "Skin tone sequence 👍🏽 and plain words share the same paragraph.",
  "Flags 🇰🇷 🇺🇸 🇯🇵 appear between Korean, English, and punctuation.",
  "Emoji with variation selector ❤️ should not split unexpectedly.",
  "A warning row uses 🚧, ✅, and ❌ while keeping readable line breaks.",
  "Calendar update 📅 at 09:30 includes a compact status summary.",
  "A chat bubble says hello 👋🏿 and then continues with a longer reply.",
  "The transport message includes 🚆, ✈️, and a final note.",
  "Mixed symbols ⭐️🔥💧 are surrounded by ordinary text for fallback metrics.",
];

const WHITESPACE_TEXTS = [
  "Leading and trailing spaces   should keep line snapshots predictable.   ",
  "Tabs\tinside\tcopy are normalized only where RN Text reports them.",
  "A hard line\nbreak appears before another sentence in the same case.",
  "Multiple     spaces     between words should not hide wrap differences.",
  "Punctuation!!! Does it wrap near commas, semicolons; and colons?",
  "Quotes “curly”, 'straight', and brackets [a/b] stay in source order.",
  "Numbers 1,234.56 and dates 2026-04-25 sit beside compact labels.",
  "Slash/path/value and dash-heavy-copy need stable boundaries.",
  "A sentence ends with nonbreaking space\u00a0before more text.",
  "Short line\n\nblank line\nthen final line checks empty ranges.\n",
];

const STYLE_TEXTS = [
  "Style variant uses a smaller font with explicit line height.",
  "Bold copy in a narrow card should still match RN line output.",
  "Italic support text includes English, 한국어, and punctuation.",
  "Letter spacing changes where the line wraps in product labels.",
  "Large type in an alert banner should preserve line text ranges.",
  "Compact line height keeps dense operational copy readable.",
  "Monospace digits 0123456789 align inside a metrics row.",
  "Serif styled copy appears in a rich article preview.",
  "RTL style override should keep Arabic النص aligned correctly.",
  "CJK style case uses 中文과 한국어 with wider font metrics.",
];

const STYLE_VARIANTS: PretextStyle[] = [
  { ...PARITY_BASE_STYLE, fontSize: 15, lineHeight: 22 },
  { ...PARITY_BASE_STYLE, fontWeight: "700" },
  { ...PARITY_BASE_STYLE, fontStyle: "italic" },
  { ...PARITY_BASE_STYLE, letterSpacing: 0.6 },
  { ...PARITY_BASE_STYLE, fontSize: 22, lineHeight: 30 },
  { ...PARITY_BASE_STYLE, fontSize: 16, lineHeight: 20 },
  { ...PARITY_BASE_STYLE, fontFamily: "monospace" },
  { ...PARITY_BASE_STYLE, fontFamily: "serif" },
  { ...PARITY_BASE_STYLE, textDirection: "rtl" },
  { ...PARITY_BASE_STYLE, fontWeight: "600", letterSpacing: 0.2 },
  { ...PARITY_BASE_STYLE, fontSize: 19, lineHeight: 32 },
  { ...PARITY_BASE_STYLE, includeFontPadding: false },
  { ...PARITY_BASE_STYLE, fontWeight: "500", fontStyle: "italic" },
  { ...PARITY_BASE_STYLE, fontSize: 17, letterSpacing: 0.1 },
  { ...PARITY_BASE_STYLE, fontSize: 20, lineHeight: 34, letterSpacing: 0.4 },
];

type CaseBuilderConfig = {
  category: ParityCaseCategory;
  count: number;
  description: string;
  prefix: string;
  styleForIndex?: (index: number) => PretextStyle;
  texts: readonly string[];
};

function createParityCases({
  category,
  count,
  description,
  prefix,
  styleForIndex = () => PARITY_BASE_STYLE,
  texts,
}: CaseBuilderConfig): ParityCase[] {
  return Array.from({ length: count }, (_, index) => {
    const text = texts[index % texts.length] ?? "";
    const variant = Math.floor(index / texts.length) + 1;
    const width = WIDTHS[(index * 5 + prefix.length) % WIDTHS.length] ?? 220;

    return {
      caseId: `${prefix}-${String(index + 1).padStart(3, "0")}`,
      category,
      description: `${description} #${variant}`,
      rnTextProps: DEFAULT_RN_TEXT_PROPS,
      style: styleForIndex(index),
      text:
        variant === 1
          ? text
          : `${text} Case ${variant} keeps this fixture unique at width ${width}.`,
      width,
    };
  });
}

export const PARITY_CASES: ParityCase[] = [
  ...createParityCases({
    category: "latin",
    count: PARITY_CASE_DISTRIBUTION.latin,
    description: "Latin, long-word, URL, and punctuation parity",
    prefix: "parity-latin",
    texts: LATIN_TEXTS,
  }),
  ...createParityCases({
    category: "korean-cjk",
    count: PARITY_CASE_DISTRIBUTION["korean-cjk"],
    description: "Korean and CJK mixed-script parity",
    prefix: "parity-korean-cjk",
    texts: KOREAN_CJK_TEXTS,
  }),
  ...createParityCases({
    category: "japanese",
    count: PARITY_CASE_DISTRIBUTION.japanese,
    description: "Japanese kana, kanji, punctuation, and Latin parity",
    prefix: "parity-japanese",
    texts: JAPANESE_TEXTS,
  }),
  ...createParityCases({
    category: "thai",
    count: PARITY_CASE_DISTRIBUTION.thai,
    description: "Thai no-space wrapping parity",
    prefix: "parity-thai",
    texts: THAI_TEXTS,
  }),
  ...createParityCases({
    category: "rtl",
    count: PARITY_CASE_DISTRIBUTION.rtl,
    description: "Arabic, Hebrew, bidi, and punctuation parity",
    prefix: "parity-rtl",
    texts: RTL_TEXTS,
  }),
  ...createParityCases({
    category: "indic",
    count: PARITY_CASE_DISTRIBUTION.indic,
    description: "Indic complex cluster and mark parity",
    prefix: "parity-indic",
    texts: INDIC_TEXTS,
  }),
  ...createParityCases({
    category: "emoji",
    count: PARITY_CASE_DISTRIBUTION.emoji,
    description: "Emoji, ZWJ, flags, skin tone, and fallback parity",
    prefix: "parity-emoji",
    texts: EMOJI_TEXTS,
  }),
  ...createParityCases({
    category: "whitespace",
    count: PARITY_CASE_DISTRIBUTION.whitespace,
    description: "Whitespace, newline, punctuation, and numeric parity",
    prefix: "parity-whitespace",
    texts: WHITESPACE_TEXTS,
  }),
  ...createParityCases({
    category: "style",
    count: PARITY_CASE_DISTRIBUTION.style,
    description: "Supported style variant parity",
    prefix: "parity-style",
    styleForIndex: (index) =>
      STYLE_VARIANTS[index % STYLE_VARIANTS.length] ?? PARITY_BASE_STYLE,
    texts: STYLE_TEXTS,
  }),
];
