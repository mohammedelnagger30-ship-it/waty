import { Task, TaskCategory, GoalType, Milestone } from '@/src/storage/entities';
import { generateId, todayISODate } from '@/src/storage/repository';
import { addDays } from '@/src/utils/taskUtils';

export interface GoalTemplate {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  motivationAr: string;
  motivationEn: string;
  category: TaskCategory;
  type: GoalType;
  targetValue: number;
  targetUnit: string;
  color: string;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'learn-language',
    titleAr: 'تعلم لغة جديدة',
    titleEn: 'Learn a New Language',
    descriptionAr: 'تعلم لغة جديدة من الصفر حتى مستوى محادثة أساسي خلال 3 أشهر',
    descriptionEn: 'Learn a new language from scratch to basic conversation level in 3 months',
    motivationAr: 'اللغة مفتاح للثقافات الأخرى وفرص جديدة في الحياة والعمل',
    motivationEn: 'Language is the key to other cultures and new opportunities in life and work',
    category: 'study',
    type: 'mid',
    targetValue: 100,
    targetUnit: 'درس',
    color: '#8B5CF6',
  },
  {
    id: 'fitness-workout',
    titleAr: 'اللياقة البدنية والتمرين',
    titleEn: 'Fitness & Workout',
    descriptionAr: 'الوصول إلى مستوى لياقة بدنية جيد من خلال تمرين منتظم خلال 90 يوماً',
    descriptionEn: 'Reach a good fitness level through regular exercise over 90 days',
    motivationAr: 'الجسم السليم هو أساس الحياة المنتجة والسعيدة',
    motivationEn: 'A healthy body is the foundation of a productive and happy life',
    category: 'health',
    type: 'mid',
    targetValue: 90,
    targetUnit: 'يوم تمرين',
    color: '#22C55E',
  },
  {
    id: 'exam-study',
    titleAr: 'الاستعداد للامتحان',
    titleEn: 'Exam Preparation',
    descriptionAr: 'خطة مكثفة للاستعداد لامتحان مهم خلال 60 يوماً',
    descriptionEn: 'An intensive plan to prepare for an important exam in 60 days',
    motivationAr: 'النجاح في الامتحان يفتح أبواب فرص المستقبل',
    motivationEn: 'Passing the exam opens doors to future opportunities',
    category: 'study',
    type: 'short',
    targetValue: 60,
    targetUnit: 'يوم دراسة',
    color: '#1A9FE8',
  },
  {
    id: 'saving-money',
    titleAr: 'توفير المال',
    titleEn: 'Save Money',
    descriptionAr: 'توفير مبلغ محدد من المال خلال 6 أشهر من خلال ادخار منتظم',
    descriptionEn: 'Save a specific amount of money over 6 months through regular saving',
    motivationAr: 'الادخار اليوم يضمن أمانك المالي وسلامة غدك',
    motivationEn: 'Saving today ensures your financial security and a safe tomorrow',
    category: 'finance',
    type: 'long',
    targetValue: 10000,
    targetUnit: 'ريال',
    color: '#14B8A6',
  },
  {
    id: 'read-books',
    titleAr: 'قراءة الكتب',
    titleEn: 'Read Books',
    descriptionAr: 'قراءة 12 كتاباً خلال السنة لتطوير المعرفة والثقافة',
    descriptionEn: 'Read 12 books in a year to develop knowledge and culture',
    motivationAr: 'القراءة غذاء العقل وطريق نحو التطور المستمر',
    motivationEn: 'Reading is food for the mind and a path to continuous growth',
    category: 'personal',
    type: 'long',
    targetValue: 12,
    targetUnit: 'كتاب',
    color: '#F59E0B',
  },
  {
    id: 'learn-programming',
    titleAr: 'تعلم البرمجة',
    titleEn: 'Learn Programming',
    descriptionAr: 'تعلم أساسيات البرمجة وبناء مشاريع عملية خلال 4 أشهر',
    descriptionEn: 'Learn programming fundamentals and build practical projects in 4 months',
    motivationAr: 'البرمجة مهارة المستقبل وفتح أبواب الإبداع التقني',
    motivationEn: 'Programming is the skill of the future and opens doors to tech creativity',
    category: 'study',
    type: 'mid',
    targetValue: 120,
    targetUnit: 'درس',
    color: '#6366F1',
  },
];

function buildMilestones(
  defs: Array<{ title: string; targetValue: number; daysFromNow?: number }>
): Milestone[] {
  const today = todayISODate();
  return defs.map((d) => ({
    id: generateId(),
    title: d.title,
    targetValue: d.targetValue,
    currentValue: 0,
    done: false,
    date: d.daysFromNow != null ? addDays(today, d.daysFromNow) : undefined,
  }));
}

function buildTasks(
  defs: Array<{ title: string; category: TaskCategory; priority: Task['priority']; estimatedMinutes: number }>
): Partial<Task>[] {
  return defs.map((d) => ({
    title: d.title,
    category: d.category,
    priority: d.priority,
    estimatedMinutes: d.estimatedMinutes,
  }));
}

export function generateTemplateData(templateId: string): { milestones: Milestone[]; tasks: Partial<Task>[] } {
  switch (templateId) {
    case 'learn-language': {
      const milestones = buildMilestones([
        { title: 'إتقان الأبجدية والنطق', targetValue: 20, daysFromNow: 15 },
        { title: 'بناء مفردات أساسية (500 كلمة)', targetValue: 40, daysFromNow: 45 },
        { title: 'فهم القواعد الأساسية', targetValue: 60, daysFromNow: 75 },
        { title: 'إجراء محادثة بسيطة', targetValue: 80, daysFromNow: 90 },
        { title: 'إتقان مهارات الاستماع', targetValue: 100, daysFromNow: 120 },
      ]);

      const tasks = buildTasks([
        { title: 'دراسة الأبجدية وأصوات الحروف', category: 'study', priority: 'high', estimatedMinutes: 45 },
        { title: 'ممارسة النطق وتكرار الأصوات', category: 'study', priority: 'high', estimatedMinutes: 30 },
        { title: 'حفظ 20 كلمة جديدة من الأرقام والتحيات', category: 'study', priority: 'high', estimatedMinutes: 45 },
        { title: 'تعلم ضمائر المخاطب والنطق الصحيح', category: 'study', priority: 'medium', estimatedMinutes: 40 },
        { title: 'ممارسة المحادثة الأولى (تعريف النفس)', category: 'study', priority: 'medium', estimatedMinutes: 45 },
        { title: 'متابعة فيديو تعليمي وفهم المحتوى', category: 'study', priority: 'medium', estimatedMinutes: 30 },
        { title: 'كتابة 10 جمل بسيطة باستخدام المفردات الجديدة', category: 'study', priority: 'medium', estimatedMinutes: 35 },
        { title: 'تطبيق تعليمي للمفردات - مراجعة يومية', category: 'study', priority: 'low', estimatedMinutes: 20 },
        { title: 'الاستماع إلى بودكاست تعليمي للمبتدئين', category: 'study', priority: 'low', estimatedMinutes: 30 },
        { title: 'مراجعة أسبوعية لكل ما تم تعلمه', category: 'study', priority: 'high', estimatedMinutes: 60 },
      ]);

      return { milestones, tasks };
    }

    case 'fitness-workout': {
      const milestones = buildMilestones([
        { title: 'بناء روتين تمرين أسبوعي', targetValue: 14, daysFromNow: 14 },
        { title: 'زيادة قوة التحمل (30 دقيقة كارديو)', targetValue: 30, daysFromNow: 30 },
        { title: 'بناء عضلات أساسية قوية', targetValue: 50, daysFromNow: 50 },
        { title: 'تحسين المرونة والتوازن', targetValue: 70, daysFromNow: 70 },
        { title: 'الوصول إلى مستوى لياقة ممتاز', targetValue: 90, daysFromNow: 90 },
      ]);

      const tasks = buildTasks([
        { title: 'تمرين كارديو خفيف لمدة 20 دقيقة', category: 'health', priority: 'high', estimatedMinutes: 25 },
        { title: 'تمارين إطالة وتسخين العضلات', category: 'health', priority: 'high', estimatedMinutes: 15 },
        { title: 'تمارين الضغط 3 مجموعات × 10 عدّات', category: 'health', priority: 'high', estimatedMinutes: 20 },
        { title: 'تمارين البطن والعضلات الأساسية', category: 'health', priority: 'medium', estimatedMinutes: 30 },
        { title: 'جري أو مشي سريع لمدة 30 دقيقة', category: 'health', priority: 'medium', estimatedMinutes: 35 },
        { title: 'تمارين القوة العلوية (أكتاف وذراعين)', category: 'health', priority: 'medium', estimatedMinutes: 40 },
        { title: 'تمارين الساقين والظهر', category: 'health', priority: 'medium', estimatedMinutes: 40 },
        { title: 'جلسة يوجا وإطالة للاستشفاء', category: 'health', priority: 'low', estimatedMinutes: 30 },
        { title: 'تتبع السعرات الحرارية ومراجعة التغذية', category: 'health', priority: 'low', estimatedMinutes: 15 },
        { title: 'قياس التقدم: الوزن والقياسات الأسبوعية', category: 'health', priority: 'medium', estimatedMinutes: 15 },
      ]);

      return { milestones, tasks };
    }

    case 'exam-study': {
      const milestones = buildMilestones([
        { title: 'إنهاء المراجعة الشاملة للمواد الأساسية', targetValue: 15, daysFromNow: 15 },
        { title: 'إتمام المرحلة الأولى لكل مادة', targetValue: 30, daysFromNow: 30 },
        { title: 'حل نماذج امتحانات سابقة', targetValue: 45, daysFromNow: 45 },
        { title: 'المراجعة النهائية المكثفة', targetValue: 55, daysFromNow: 55 },
        { title: 'محاكاة الامتحان النهائي', targetValue: 60, daysFromNow: 60 },
      ]);

      const tasks = buildTasks([
        { title: 'وضع خطة دراسة مفصلة وجدول زمني', category: 'study', priority: 'high', estimatedMinutes: 45 },
        { title: 'مراجعة الفصول الأولى وتدوين الملخصات', category: 'study', priority: 'high', estimatedMinutes: 60 },
        { title: 'حل تمارين الفصول الأولى والتحقق من الإجابات', category: 'study', priority: 'high', estimatedMinutes: 50 },
        { title: 'دراسة مفاهيم الجزء الثاني من المنهج', category: 'study', priority: 'high', estimatedMinutes: 60 },
        { title: 'حل أسئلة السنوات السابقة - القسم الأول', category: 'study', priority: 'high', estimatedMinutes: 45 },
        { title: 'مراجعة نقاط الضعف وتدوين الملاحظات', category: 'study', priority: 'medium', estimatedMinutes: 40 },
        { title: 'حل نموذج امتحاني كامل وتوقيت النفس', category: 'study', priority: 'high', estimatedMinutes: 90 },
        { title: 'مراجعة الملخصات النهائية لكل مادة', category: 'study', priority: 'medium', estimatedMinutes: 60 },
        { title: 'حل تمارين إضافية للفصول الصعبة', category: 'study', priority: 'medium', estimatedMinutes: 45 },
        { title: 'محاكاة يوم الامتحان: نموذج كامل بظروف حقيقية', category: 'study', priority: 'high', estimatedMinutes: 120 },
      ]);

      return { milestones, tasks };
    }

    case 'saving-money': {
      const milestones = buildMilestones([
        { title: 'توفير 1,500 (الشهر الأول)', targetValue: 1500, daysFromNow: 30 },
        { title: 'توفير 3,500 (الشهر الثاني)', targetValue: 3500, daysFromNow: 60 },
        { title: 'توفير 5,500 (الشهر الثالث)', targetValue: 5500, daysFromNow: 90 },
        { title: 'توفير 8,000 (الشهر الرابع)', targetValue: 8000, daysFromNow: 120 },
        { title: 'توفير 10,000 (الهدف النهائي)', targetValue: 10000, daysFromNow: 180 },
      ]);

      const tasks = buildTasks([
        { title: 'تحليل المصاريف الشهرية وتحديد مجالات التوفير', category: 'finance', priority: 'high', estimatedMinutes: 45 },
        { title: 'وضع ميزانية شهرية تفصيلية', category: 'finance', priority: 'high', estimatedMinutes: 40 },
        { title: 'تحديد مصاريف يمكن الاستغناء عنها', category: 'finance', priority: 'high', estimatedMinutes: 30 },
        { title: 'فتح حساب توفير مخصص للهدف', category: 'finance', priority: 'medium', estimatedMinutes: 30 },
        { title: 'تحويل مبلغ ادخار آلي شهرياً', category: 'finance', priority: 'high', estimatedMinutes: 20 },
        { title: 'تتبع المصاريف اليومية في تطبيق', category: 'finance', priority: 'medium', estimatedMinutes: 10 },
        { title: 'مراجعة الميزانية الأسبوعية وتعديلها', category: 'finance', priority: 'medium', estimatedMinutes: 25 },
        { title: 'البحث عن طرق لزيادة الدخل الفرعي', category: 'finance', priority: 'low', estimatedMinutes: 45 },
        { title: 'مراجعة التقدم الشهري وإعادة تقييم الهدف', category: 'finance', priority: 'medium', estimatedMinutes: 30 },
        { title: 'تقليل مصاريف الترفيه بنسبة 30%', category: 'finance', priority: 'low', estimatedMinutes: 20 },
      ]);

      return { milestones, tasks };
    }

    case 'read-books': {
      const milestones = buildMilestones([
        { title: 'إكمال أول كتابين', targetValue: 2, daysFromNow: 60 },
        { title: 'إكمال 4 كتب', targetValue: 4, daysFromNow: 120 },
        { title: 'إكمال 6 كتب', targetValue: 6, daysFromNow: 180 },
        { title: 'إكمال 9 كتب', targetValue: 9, daysFromNow: 270 },
        { title: 'إكمال 12 كتاباً (الهدف السنوي)', targetValue: 12, daysFromNow: 365 },
      ]);

      const tasks = buildTasks([
        { title: 'اختيار قائمة الكتب الـ12 للسنة', category: 'personal', priority: 'high', estimatedMinutes: 45 },
        { title: 'شراء أو تنزيل أول كتابين', category: 'personal', priority: 'medium', estimatedMinutes: 30 },
        { title: 'قراءة 30 صفحة من الكتاب الأول', category: 'personal', priority: 'high', estimatedMinutes: 45 },
        { title: 'تدوين أهم الأفكار من فصول الكتاب الأول', category: 'personal', priority: 'medium', estimatedMinutes: 30 },
        { title: 'قراءة 20 صفحة يومياً (روتين قراءة)', category: 'personal', priority: 'high', estimatedMinutes: 30 },
        { title: 'كتابة ملخص قصير للكتاب الأول بعد إكماله', category: 'personal', priority: 'medium', estimatedMinutes: 40 },
        { title: 'مشاركة أبرز الاستفادات مع صديق أو مجموعة', category: 'personal', priority: 'low', estimatedMinutes: 20 },
        { title: 'قراءة كتاب في مجال جديدة (تنويع)', category: 'personal', priority: 'medium', estimatedMinutes: 45 },
        { title: 'مراجعة قائمة الكتب وتعديلها حسب الاهتمام', category: 'personal', priority: 'low', estimatedMinutes: 25 },
        { title: 'تقييم الكتب المقروءة وكتابة مراجعات', category: 'personal', priority: 'low', estimatedMinutes: 30 },
      ]);

      return { milestones, tasks };
    }

    case 'learn-programming': {
      const milestones = buildMilestones([
        { title: 'فهم أساسيات البرمجة والمفاهيم', targetValue: 20, daysFromNow: 20 },
        { title: 'إتقان بناء الجملة (Syntax) والعمليات', targetValue: 40, daysFromNow: 40 },
        { title: 'بناء أول مشروع تطبيقي بسيط', targetValue: 60, daysFromNow: 60 },
        { title: 'فهم هياكل البيانات والخوارزميات', targetValue: 90, daysFromNow: 90 },
        { title: 'بناء مشروع نهائي متكامل', targetValue: 120, daysFromNow: 120 },
      ]);

      const tasks = buildTasks([
        { title: 'إعداد بيئة التطوير وتثبيت الأدوات', category: 'study', priority: 'high', estimatedMinutes: 45 },
        { title: 'دراسة المتغيرات وأنواع البيانات', category: 'study', priority: 'high', estimatedMinutes: 40 },
        { title: 'ممارسة الجمل الشرطية والحلقات التكرارية', category: 'study', priority: 'high', estimatedMinutes: 45 },
        { title: 'تعلم الدوال (Functions) وكيفية كتابتها', category: 'study', priority: 'high', estimatedMinutes: 50 },
        { title: 'دراسة المصفوفات والكائنات (Arrays & Objects)', category: 'study', priority: 'medium', estimatedMinutes: 45 },
        { title: 'حل 5 تمارين برمجية على المنصة التعليمية', category: 'study', priority: 'medium', estimatedMinutes: 60 },
        { title: 'بناء برنامج حاسبة بسيط كمشروع تطبيقي', category: 'study', priority: 'medium', estimatedMinutes: 90 },
        { title: 'تعلم أساسيات التحكم في الإصدارات (Git)', category: 'study', priority: 'low', estimatedMinutes: 40 },
        { title: 'دراسة المفاهيم المتقدمة: البرمجة الكائنية (OOP)', category: 'study', priority: 'medium', estimatedMinutes: 60 },
        { title: 'بناء مشروع نهائي: تطبيق قائمة مهام', category: 'study', priority: 'high', estimatedMinutes: 120 },
      ]);

      return { milestones, tasks };
    }

    default:
      return { milestones: [], tasks: [] };
  }
}
