/**
 * Question Scheduler — smart rotation of daily poll questions.
 *
 * Provides a large pool of questions across categories.
 * Falls back to these when Supabase questions aren't available.
 * Categories tie to real-world topics for maximum engagement.
 */

export interface ScheduledQuestion {
  text_en: string;
  text_ar: string;
  category: "governance" | "economy" | "safety" | "society" | "rights" | "environment" | "technology";
}

export const QUESTION_POOL: ScheduledQuestion[] = [
  // Governance
  {
    text_en: "Do you trust your government to act in the people's best interest?",
    text_ar: "هل تثق بحكومتك لتعمل لمصلحة الشعب؟",
    category: "governance",
  },
  {
    text_en: "Should citizens have the right to recall elected officials before their term ends?",
    text_ar: "هل يجب أن يكون للمواطنين الحق في عزل المسؤولين المنتخبين قبل انتهاء ولايتهم؟",
    category: "governance",
  },
  {
    text_en: "Is corruption the biggest obstacle to development in your country?",
    text_ar: "هل الفساد هو أكبر عائق أمام التنمية في بلدك؟",
    category: "governance",
  },
  {
    text_en: "Do you believe elections in your country are fair and transparent?",
    text_ar: "هل تعتقد أن الانتخابات في بلدك نزيهة وشفافة؟",
    category: "governance",
  },
  {
    text_en: "Should political leaders be required to publicly disclose their finances?",
    text_ar: "هل يجب على القادة السياسيين الإفصاح علناً عن أموالهم؟",
    category: "governance",
  },
  // Economy
  {
    text_en: "Can the average person in your country afford basic healthcare?",
    text_ar: "هل يستطيع الشخص العادي في بلدك تحمل تكاليف الرعاية الصحية الأساسية؟",
    category: "economy",
  },
  {
    text_en: "Is the wealth gap in your country growing too fast?",
    text_ar: "هل فجوة الثروة في بلدك تتزايد بسرعة كبيرة؟",
    category: "economy",
  },
  {
    text_en: "Do you think your generation will be financially better off than your parents?",
    text_ar: "هل تعتقد أن جيلك سيكون أفضل مالياً من جيل والديك؟",
    category: "economy",
  },
  {
    text_en: "Should basic necessities like food and water be free for everyone?",
    text_ar: "هل يجب أن تكون الضروريات الأساسية كالطعام والماء مجانية للجميع؟",
    category: "economy",
  },
  {
    text_en: "Is unemployment the most urgent problem facing young people today?",
    text_ar: "هل البطالة هي المشكلة الأكثر إلحاحاً التي تواجه الشباب اليوم؟",
    category: "economy",
  },
  // Safety
  {
    text_en: "Do you feel safe walking alone at night in your neighborhood?",
    text_ar: "هل تشعر بالأمان عند المشي وحدك ليلاً في حيك؟",
    category: "safety",
  },
  {
    text_en: "Should civilians have access to weapons for self-defense?",
    text_ar: "هل يجب أن يحصل المدنيون على أسلحة للدفاع عن النفس؟",
    category: "safety",
  },
  {
    text_en: "Do the police in your area serve and protect all communities equally?",
    text_ar: "هل الشرطة في منطقتك تخدم وتحمي جميع المجتمعات بالتساوي؟",
    category: "safety",
  },
  {
    text_en: "Is your country prepared for the next natural disaster?",
    text_ar: "هل بلدك مستعد للكارثة الطبيعية القادمة؟",
    category: "safety",
  },
  // Society
  {
    text_en: "Should education be completely free at all levels?",
    text_ar: "هل يجب أن يكون التعليم مجانياً تماماً في جميع المراحل؟",
    category: "society",
  },
  {
    text_en: "Is social media doing more harm than good to society?",
    text_ar: "هل وسائل التواصل الاجتماعي تضر المجتمع أكثر مما تنفعه؟",
    category: "society",
  },
  {
    text_en: "Do you think the media in your country reports the truth?",
    text_ar: "هل تعتقد أن الإعلام في بلدك ينقل الحقيقة؟",
    category: "society",
  },
  {
    text_en: "Should religious institutions have influence over government policy?",
    text_ar: "هل يجب أن يكون للمؤسسات الدينية تأثير على سياسة الحكومة؟",
    category: "society",
  },
  {
    text_en: "Is the quality of life in your country improving or declining?",
    text_ar: "هل جودة الحياة في بلدك تتحسن أم تتراجع؟",
    category: "society",
  },
  // Rights
  {
    text_en: "Does everyone in your country have equal access to justice?",
    text_ar: "هل يتمتع الجميع في بلدك بوصول متساوٍ إلى العدالة؟",
    category: "rights",
  },
  {
    text_en: "Should internet access be considered a basic human right?",
    text_ar: "هل يجب اعتبار الوصول إلى الإنترنت حقاً أساسياً من حقوق الإنسان؟",
    category: "rights",
  },
  {
    text_en: "Are women treated equally in your workplace or school?",
    text_ar: "هل تُعامل النساء بالمساواة في مكان عملك أو مدرستك؟",
    category: "rights",
  },
  {
    text_en: "Should governments be allowed to monitor citizens' online activity?",
    text_ar: "هل يجب السماح للحكومات بمراقبة نشاط المواطنين على الإنترنت؟",
    category: "rights",
  },
  // Environment
  {
    text_en: "Is climate change the greatest threat facing humanity?",
    text_ar: "هل تغير المناخ هو أكبر تهديد يواجه البشرية؟",
    category: "environment",
  },
  {
    text_en: "Should your country ban single-use plastics?",
    text_ar: "هل يجب على بلدك حظر البلاستيك أحادي الاستخدام؟",
    category: "environment",
  },
  {
    text_en: "Is your city's air quality getting worse?",
    text_ar: "هل جودة الهواء في مدينتك تزداد سوءاً؟",
    category: "environment",
  },
  // Technology
  {
    text_en: "Will AI replace more jobs than it creates in the next 10 years?",
    text_ar: "هل سيحل الذكاء الاصطناعي محل وظائف أكثر مما يخلق في السنوات العشر القادمة؟",
    category: "technology",
  },
  {
    text_en: "Should your personal data be owned by you, not tech companies?",
    text_ar: "هل يجب أن تكون بياناتك الشخصية ملكاً لك وليس لشركات التكنولوجيا؟",
    category: "technology",
  },
  {
    text_en: "Do you trust AI to make important decisions about your life?",
    text_ar: "هل تثق بالذكاء الاصطناعي لاتخاذ قرارات مهمة بشأن حياتك؟",
    category: "technology",
  },
  {
    text_en: "Should children under 13 be banned from social media?",
    text_ar: "هل يجب منع الأطفال دون 13 عاماً من وسائل التواصل الاجتماعي؟",
    category: "technology",
  },
];

/**
 * Get today's question from the pool.
 * Uses day-of-year to cycle through all questions.
 * Different from the Supabase questions — this is the fallback pool.
 */
export function getTodaysQuestion(): ScheduledQuestion {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const index = (dayOfYear - 1) % QUESTION_POOL.length;
  return QUESTION_POOL[index];
}

/**
 * Get the category color for display.
 */
export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    governance: "#F59E0B",
    economy: "#10B981",
    safety: "#EF4444",
    society: "#8B5CF6",
    rights: "#3B82F6",
    environment: "#22C55E",
    technology: "#06B6D4",
  };
  return colors[category] || "#94A3B8";
}

/**
 * Get the category icon for display.
 */
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    governance: "🏛️",
    economy: "💰",
    safety: "🛡️",
    society: "👥",
    rights: "⚖️",
    environment: "🌍",
    technology: "🤖",
  };
  return icons[category] || "❓";
}
