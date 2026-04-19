import 'package:folio/models/models.dart';

// ---------------------------------------------------------------------------
// PregnancyProfile
// ---------------------------------------------------------------------------

final mockProfile = PregnancyProfile(
  dueDate: DateTime(2025, 9, 5),
  lastMenstrualPeriod: DateTime(2024, 11, 29),
  currentWeek: 22,
  currentTrimester: 2,
  userName: 'Mira',
  height: 165.0,
  units: WeightUnit.kg,
  avatarInitial: 'M',
);

// ---------------------------------------------------------------------------
// WeightEntries — weeks 15-22, gradual 56→59 kg
// ---------------------------------------------------------------------------

final List<WeightEntry> mockWeightEntries = [
  WeightEntry(id: 'w-1', date: DateTime(2025, 3, 14), value: 56.0),
  WeightEntry(id: 'w-2', date: DateTime(2025, 3, 17), value: 56.2),
  WeightEntry(id: 'w-3', date: DateTime(2025, 3, 21), value: 56.3),
  WeightEntry(id: 'w-4', date: DateTime(2025, 3, 25), value: 56.5),
  WeightEntry(id: 'w-5', date: DateTime(2025, 3, 28), value: 56.7),
  WeightEntry(id: 'w-6', date: DateTime(2025, 4, 1), value: 56.9),
  WeightEntry(id: 'w-7', date: DateTime(2025, 4, 4), value: 57.1),
  WeightEntry(id: 'w-8', date: DateTime(2025, 4, 7), value: 57.3),
  WeightEntry(id: 'w-9', date: DateTime(2025, 4, 10), value: 57.5),
  WeightEntry(id: 'w-10', date: DateTime(2025, 4, 14), value: 57.7),
  WeightEntry(id: 'w-11', date: DateTime(2025, 4, 17), value: 57.8),
  WeightEntry(id: 'w-12', date: DateTime(2025, 4, 21), value: 58.0),
  WeightEntry(id: 'w-13', date: DateTime(2025, 4, 24), value: 58.2),
  WeightEntry(id: 'w-14', date: DateTime(2025, 4, 28), value: 58.5),
  WeightEntry(id: 'w-15', date: DateTime(2025, 5, 1), value: 58.7, notes: 'Feeling good'),
  WeightEntry(id: 'w-16', date: DateTime(2025, 5, 4), value: 58.9),
  WeightEntry(id: 'w-17', date: DateTime(2025, 5, 7), value: 59.0),
];

// ---------------------------------------------------------------------------
// CycleEntries — pre-pregnancy history
// ---------------------------------------------------------------------------

final List<CycleEntry> mockCycleEntries = [
  CycleEntry(
    id: 'c-1',
    startDate: DateTime(2024, 8, 2),
    endDate: DateTime(2024, 8, 7),
    isIrregular: false,
  ),
  CycleEntry(
    id: 'c-2',
    startDate: DateTime(2024, 8, 30),
    endDate: DateTime(2024, 9, 4),
    isIrregular: false,
  ),
  CycleEntry(
    id: 'c-3',
    startDate: DateTime(2024, 9, 28),
    endDate: DateTime(2024, 10, 3),
    isIrregular: false,
  ),
  CycleEntry(
    id: 'c-4',
    startDate: DateTime(2024, 10, 29),
    endDate: DateTime(2024, 11, 2),
    isIrregular: true,
    notes: 'Shorter than usual',
  ),
  CycleEntry(
    id: 'c-5',
    startDate: DateTime(2024, 11, 29),
    endDate: DateTime(2024, 12, 3),
    isIrregular: false,
    notes: 'Last period before pregnancy',
  ),
];

// ---------------------------------------------------------------------------
// MoodEntries — last 2 weeks
// ---------------------------------------------------------------------------

final List<MoodEntry> mockMoodEntries = [
  MoodEntry(id: 'm-1', date: DateTime(2025, 4, 24), moodLevel: 4, energyLevel: 3),
  MoodEntry(id: 'm-2', date: DateTime(2025, 4, 25), moodLevel: 3, energyLevel: 2, notes: 'Tired after work'),
  MoodEntry(id: 'm-3', date: DateTime(2025, 4, 26), moodLevel: 5, energyLevel: 4),
  MoodEntry(id: 'm-4', date: DateTime(2025, 4, 27), moodLevel: 4, energyLevel: 4),
  MoodEntry(id: 'm-5', date: DateTime(2025, 4, 28), moodLevel: 3, energyLevel: 3),
  MoodEntry(id: 'm-6', date: DateTime(2025, 4, 29), moodLevel: 2, energyLevel: 2, notes: 'Rough night'),
  MoodEntry(id: 'm-7', date: DateTime(2025, 4, 30), moodLevel: 3, energyLevel: 3),
  MoodEntry(id: 'm-8', date: DateTime(2025, 5, 1), moodLevel: 4, energyLevel: 4),
  MoodEntry(id: 'm-9', date: DateTime(2025, 5, 2), moodLevel: 5, energyLevel: 5, notes: 'Great day!'),
  MoodEntry(id: 'm-10', date: DateTime(2025, 5, 3), moodLevel: 4, energyLevel: 3),
  MoodEntry(id: 'm-11', date: DateTime(2025, 5, 4), moodLevel: 4, energyLevel: 4),
  MoodEntry(id: 'm-12', date: DateTime(2025, 5, 5), moodLevel: 3, energyLevel: 3),
  MoodEntry(id: 'm-13', date: DateTime(2025, 5, 6), moodLevel: 4, energyLevel: 4),
  MoodEntry(id: 'm-14', date: DateTime(2025, 5, 7), moodLevel: 5, energyLevel: 4),
];

// ---------------------------------------------------------------------------
// SymptomEntries
// ---------------------------------------------------------------------------

final List<SymptomEntry> mockSymptomEntries = [
  SymptomEntry(id: 's-1', date: DateTime(2025, 4, 28), type: SymptomType.backPain, severity: 2, notes: 'Lower back'),
  SymptomEntry(id: 's-2', date: DateTime(2025, 4, 29), type: SymptomType.fatigue, severity: 3),
  SymptomEntry(id: 's-3', date: DateTime(2025, 5, 1), type: SymptomType.nausea, severity: 1),
  SymptomEntry(id: 's-4', date: DateTime(2025, 5, 2), type: SymptomType.headache, severity: 2),
  SymptomEntry(id: 's-5', date: DateTime(2025, 5, 4), type: SymptomType.swelling, severity: 1, notes: 'Ankles slightly swollen'),
  SymptomEntry(id: 's-6', date: DateTime(2025, 5, 5), type: SymptomType.cramping, severity: 1),
  SymptomEntry(id: 's-7', date: DateTime(2025, 5, 6), type: SymptomType.backPain, severity: 2),
  SymptomEntry(id: 's-8', date: DateTime(2025, 5, 7), type: SymptomType.dizziness, severity: 1, notes: 'Brief episode in morning'),
];

// ---------------------------------------------------------------------------
// DoctorVisits
// ---------------------------------------------------------------------------

final List<DoctorVisit> mockDoctorVisits = [
  DoctorVisit(
    id: 'dv-1',
    date: DateTime(2025, 2, 10),
    doctorName: 'Dr. Ananya Sharma',
    summary: 'Initial prenatal visit. All vitals normal. Blood work ordered.',
    notes: 'Next visit in 4 weeks',
  ),
  DoctorVisit(
    id: 'dv-2',
    date: DateTime(2025, 3, 10),
    doctorName: 'Dr. Ananya Sharma',
    summary: 'Second trimester screening. Ultrasound shows healthy development.',
  ),
  DoctorVisit(
    id: 'dv-3',
    date: DateTime(2025, 4, 7),
    doctorName: 'Dr. Ananya Sharma',
    summary: 'Routine checkup. Weight gain on track. Baby heartbeat strong at 150 bpm.',
    notes: 'Discussed birth plan options',
  ),
  DoctorVisit(
    id: 'dv-4',
    date: DateTime(2025, 5, 5),
    doctorName: 'Dr. Ananya Sharma',
    summary: 'Anatomy scan complete. All measurements within normal range.',
  ),
];

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

final List<Reminder> mockReminders = [
  Reminder(id: 'r-1', date: DateTime(2025, 4, 20), title: 'Blood test results pickup', isDone: true),
  Reminder(id: 'r-2', date: DateTime(2025, 4, 28), title: 'Prenatal yoga class', isDone: true),
  Reminder(id: 'r-3', date: DateTime(2025, 5, 3), title: 'Order nursery furniture', isDone: true),
  Reminder(id: 'r-4', date: DateTime(2025, 5, 12), title: 'Next checkup', isDone: false),
  Reminder(id: 'r-5', date: DateTime(2025, 5, 15), title: 'Glucose tolerance test', isDone: false),
  Reminder(id: 'r-6', date: DateTime(2025, 5, 20), title: 'Birthing class registration deadline', isDone: false),
];

// ---------------------------------------------------------------------------
// WeekContent — all 42 weeks
// ---------------------------------------------------------------------------

const _sizeComparisons = [
  'poppy seed', 'sesame seed', 'lentil', 'blueberry', 'raspberry',
  'pea', 'olive', 'grape', 'kumquat', 'prune',
  'lime', 'plum', 'peach', 'lemon', 'navel orange',
  'apple', 'avocado', 'sweet potato', 'mango', 'banana',
  'carrot', 'papaya', 'grapefruit', 'corn ear', 'cauliflower',
  'lettuce head', 'scallion bunch', 'eggplant', 'butternut squash', 'cabbage',
  'coconut', 'jicama', 'pineapple', 'cantaloupe', 'honeydew melon',
  'romaine lettuce', 'Swiss chard', 'leek', 'small pumpkin', 'watermelon',
  'watermelon', 'watermelon',
];

String _trimesterLabel(int week) {
  if (week <= 13) return 'First Trimester';
  if (week <= 26) return 'Second Trimester';
  return 'Third Trimester';
}

final List<WeekContent> mockWeekContent = List.generate(42, (i) {
  final week = i + 1;
  String? milestoneTitle;
  String? milestoneDescription;

  if (week == 12) {
    milestoneTitle = 'End of first trimester!';
    milestoneDescription = 'The risk of miscarriage drops significantly after this point.';
  } else if (week == 20) {
    milestoneTitle = 'Halfway there!';
    milestoneDescription = 'You are halfway through your pregnancy journey.';
  } else if (week == 28) {
    milestoneTitle = 'Third trimester begins!';
    milestoneDescription = 'The home stretch — your baby is getting ready for the outside world.';
  } else if (week == 37) {
    milestoneTitle = 'Full term!';
    milestoneDescription = 'Your baby is considered full term and ready to arrive.';
  }

  return WeekContent(
    weekNumber: week,
    trimesterLabel: _trimesterLabel(week),
    sizeComparison: _sizeComparisons[i],
    milestoneTitle: milestoneTitle,
    milestoneDescription: milestoneDescription,
    bodyChanges: [
      InfoItem(
        title: 'Week $week changes',
        description: 'Your body continues to adapt to support your growing baby.',
      ),
      InfoItem(
        title: 'Hormonal shifts',
        description: 'Hormone levels adjust to meet the needs of week $week.',
      ),
    ],
    babyDevelopment: [
      InfoItem(
        title: 'Growth',
        description: 'Your baby is now the size of a ${_sizeComparisons[i]}.',
      ),
      InfoItem(
        title: 'Development',
        description: 'Key organ and tissue development continues at week $week.',
      ),
    ],
    selfCareItems: [
      'Take prenatal vitamins',
      'Drink 8 glasses of water',
      'Do kegel exercises',
      'Gentle stretching',
    ],
    exerciseGuides: [
      'Prenatal yoga',
      'Walking for 20 minutes',
      'Pelvic floor exercises',
    ],
    nutritionTips: [
      'Eat iron-rich foods like spinach and lentils',
      'Include calcium from dairy or fortified alternatives',
      'Snack on nuts and seeds for healthy fats',
    ],
  );
});

// ---------------------------------------------------------------------------
// SelfCareCheckState
// ---------------------------------------------------------------------------

final List<SelfCareCheckState> mockSelfCareStates = [
  SelfCareCheckState(
    weekNumber: 22,
    date: DateTime(2025, 5, 5),
    completedItems: ['Take prenatal vitamins', 'Drink 8 glasses of water', 'Do kegel exercises', 'Gentle stretching'],
  ),
  SelfCareCheckState(
    weekNumber: 22,
    date: DateTime(2025, 5, 6),
    completedItems: ['Take prenatal vitamins', 'Drink 8 glasses of water'],
  ),
  SelfCareCheckState(
    weekNumber: 22,
    date: DateTime(2025, 5, 7),
    completedItems: ['Take prenatal vitamins'],
  ),
  SelfCareCheckState(
    weekNumber: 22,
    date: DateTime(2025, 5, 8),
    completedItems: [],
  ),
];

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

final List<Article> mockArticles = [
  Article(
    id: 'a-1',
    title: 'Essential Nutrients for the Second Trimester',
    topic: ArticleTopic.nutrition,
    body: 'During the second trimester, your baby undergoes rapid growth. Focus on iron, calcium, and omega-3 fatty acids to support healthy development. Iron-rich foods include lean meats, beans, and fortified cereals.',
    illustrationUrl: 'https://picsum.photos/seed/art1/400/250',
    readTime: '5 min',
    isBookmarked: true,
    relatedArticleIds: ['a-2', 'a-5'],
  ),
  Article(
    id: 'a-2',
    title: 'Healthy Snacking During Pregnancy',
    topic: ArticleTopic.nutrition,
    body: 'Smart snacking helps maintain stable blood sugar and provides nutrients between meals. Try Greek yogurt with berries, apple slices with almond butter, or hummus with vegetables.',
    readTime: '4 min',
    isBookmarked: false,
    relatedArticleIds: ['a-1', 'a-3'],
  ),
  Article(
    id: 'a-3',
    title: 'Hydration: How Much Water Do You Really Need?',
    topic: ArticleTopic.nutrition,
    body: 'Staying hydrated is crucial during pregnancy. Aim for at least 8-10 glasses of water daily. Proper hydration supports amniotic fluid levels and helps prevent urinary tract infections.',
    readTime: '3 min',
    isBookmarked: false,
    relatedArticleIds: ['a-1', 'a-2'],
  ),
  Article(
    id: 'a-4',
    title: 'Understanding Your Changing Body',
    topic: ArticleTopic.bodyChanges,
    body: 'Your body goes through remarkable changes during pregnancy. From increased blood volume to shifting center of gravity, understanding these changes helps you adapt and stay comfortable.',
    illustrationUrl: 'https://picsum.photos/seed/art4/400/250',
    readTime: '6 min',
    isBookmarked: true,
    relatedArticleIds: ['a-6', 'a-7'],
  ),
  Article(
    id: 'a-5',
    title: 'Managing Pregnancy Weight Gain',
    topic: ArticleTopic.bodyChanges,
    body: 'Healthy weight gain during pregnancy varies by pre-pregnancy BMI. For most, gaining 25-35 pounds is recommended. Focus on nutrient-dense foods rather than eating for two.',
    readTime: '5 min',
    isBookmarked: false,
    relatedArticleIds: ['a-1', 'a-4'],
  ),
  Article(
    id: 'a-6',
    title: 'Sleep Positions for Comfort',
    topic: ArticleTopic.bodyChanges,
    body: 'As your belly grows, sleeping positions matter more. Left-side sleeping improves circulation to your baby. Use pillows between your knees and under your belly for support.',
    readTime: '4 min',
    isBookmarked: false,
    relatedArticleIds: ['a-4', 'a-5'],
  ),
  Article(
    id: 'a-7',
    title: 'Prenatal Care: What to Expect at Each Visit',
    topic: ArticleTopic.maternalCare,
    body: 'Regular prenatal visits are essential for monitoring your health and your baby\'s development. Visits typically include weight checks, blood pressure, urine tests, and measuring fundal height.',
    illustrationUrl: 'https://picsum.photos/seed/art7/400/250',
    readTime: '7 min',
    isBookmarked: true,
    relatedArticleIds: ['a-8', 'a-9'],
  ),
  Article(
    id: 'a-8',
    title: 'When to Call Your Doctor',
    topic: ArticleTopic.maternalCare,
    body: 'Certain symptoms warrant immediate medical attention: heavy bleeding, severe headaches, vision changes, or reduced fetal movement. Trust your instincts — it is always better to call.',
    readTime: '4 min',
    isBookmarked: false,
    relatedArticleIds: ['a-7', 'a-9'],
  ),
  Article(
    id: 'a-9',
    title: 'Preparing Your Birth Plan',
    topic: ArticleTopic.maternalCare,
    body: 'A birth plan communicates your preferences for labor and delivery. Consider pain management options, delivery positions, who you want present, and immediate newborn care wishes.',
    readTime: '6 min',
    isBookmarked: false,
    relatedArticleIds: ['a-7', 'a-8'],
  ),
  Article(
    id: 'a-10',
    title: 'Baby Development: The Second Trimester',
    topic: ArticleTopic.babyDevelopment,
    body: 'During weeks 14-27, your baby develops fingerprints, can hear sounds, and begins practicing breathing movements. This is often when parents first feel fetal movement.',
    illustrationUrl: 'https://picsum.photos/seed/art10/400/250',
    readTime: '5 min',
    isBookmarked: false,
    relatedArticleIds: ['a-11', 'a-12'],
  ),
  Article(
    id: 'a-11',
    title: 'Understanding Fetal Movement',
    topic: ArticleTopic.babyDevelopment,
    body: 'Most mothers first feel movement between weeks 18-25. Movements start as flutters and progress to kicks and rolls. Tracking kick counts after week 28 helps monitor baby health.',
    readTime: '4 min',
    isBookmarked: false,
    relatedArticleIds: ['a-10', 'a-12'],
  ),
  Article(
    id: 'a-12',
    title: 'Your Baby\'s Senses in the Womb',
    topic: ArticleTopic.babyDevelopment,
    body: 'By the second trimester, your baby can hear your heartbeat and voice. They can taste amniotic fluid, respond to light, and develop a sense of touch. Talking and singing to your baby helps bonding.',
    readTime: '5 min',
    isBookmarked: true,
    relatedArticleIds: ['a-10', 'a-11'],
  ),
];

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

final List<Exercise> mockExercises = [
  Exercise(
    id: 'e-1',
    name: 'Deep Belly Breathing',
    category: ExerciseCategory.breathing,
    durationSeconds: 300,
    steps: [
      'Sit comfortably with your back supported',
      'Place one hand on your chest and one on your belly',
      'Inhale slowly through your nose for 4 counts',
      'Feel your belly rise as your lungs fill',
      'Exhale slowly through your mouth for 6 counts',
      'Repeat for 5 minutes',
    ],
    benefits: ['Reduces anxiety', 'Lowers blood pressure', 'Prepares for labor breathing'],
    difficulty: 'Beginner',
  ),
  Exercise(
    id: 'e-2',
    name: '4-7-8 Breathing Technique',
    category: ExerciseCategory.breathing,
    durationSeconds: 480,
    steps: [
      'Sit or lie in a comfortable position',
      'Inhale through your nose for 4 counts',
      'Hold your breath for 7 counts',
      'Exhale through your mouth for 8 counts',
      'Repeat 4-8 cycles',
    ],
    benefits: ['Promotes sleep', 'Calms nervous system', 'Reduces stress hormones'],
    difficulty: 'Beginner',
  ),
  Exercise(
    id: 'e-3',
    name: 'Box Breathing',
    category: ExerciseCategory.breathing,
    durationSeconds: 360,
    steps: [
      'Inhale for 4 counts',
      'Hold for 4 counts',
      'Exhale for 4 counts',
      'Hold for 4 counts',
      'Repeat for 6 minutes',
    ],
    benefits: ['Improves focus', 'Manages pain perception', 'Balances autonomic nervous system'],
    difficulty: 'Intermediate',
  ),
  Exercise(
    id: 'e-4',
    name: 'Prenatal Cat-Cow Stretch',
    category: ExerciseCategory.stretching,
    durationSeconds: 300,
    steps: [
      'Start on hands and knees, wrists under shoulders',
      'Inhale: drop belly, lift head and tailbone (cow)',
      'Exhale: round spine, tuck chin and tailbone (cat)',
      'Move slowly and gently with your breath',
      'Repeat 10-15 times',
    ],
    benefits: ['Relieves back pain', 'Improves spinal flexibility', 'Strengthens core gently'],
    difficulty: 'Beginner',
    illustrationUrl: 'https://picsum.photos/seed/ex4/400/250',
  ),
  Exercise(
    id: 'e-5',
    name: 'Hip Opener Stretch',
    category: ExerciseCategory.stretching,
    durationSeconds: 420,
    steps: [
      'Sit on the floor with soles of your feet together',
      'Hold your ankles and sit tall',
      'Gently press knees toward the floor with your elbows',
      'Hold for 30 seconds, release, repeat 5 times',
    ],
    benefits: ['Opens hips for delivery', 'Reduces hip pain', 'Improves flexibility'],
    difficulty: 'Beginner',
  ),
  Exercise(
    id: 'e-6',
    name: 'Side-Lying Stretch',
    category: ExerciseCategory.stretching,
    durationSeconds: 360,
    steps: [
      'Lie on your left side with a pillow between your knees',
      'Extend your top arm overhead and stretch',
      'Hold for 20 seconds, breathing deeply',
      'Roll to the other side and repeat',
      'Do 3 rounds per side',
    ],
    benefits: ['Stretches intercostal muscles', 'Creates space for breathing', 'Relieves rib discomfort'],
    difficulty: 'Beginner',
  ),
  Exercise(
    id: 'e-7',
    name: 'Gentle Hamstring Stretch',
    category: ExerciseCategory.stretching,
    durationSeconds: 300,
    steps: [
      'Stand facing a chair or low table',
      'Place one heel on the surface, keep leg straight',
      'Lean forward gently from the hips',
      'Hold for 20 seconds per leg',
      'Repeat 3 times per side',
    ],
    benefits: ['Reduces leg cramps', 'Improves circulation', 'Relieves lower back tension'],
    difficulty: 'Beginner',
  ),
  Exercise(
    id: 'e-8',
    name: 'Body Scan Meditation',
    category: ExerciseCategory.meditation,
    durationSeconds: 600,
    steps: [
      'Lie comfortably on your left side with pillow support',
      'Close your eyes and take 3 deep breaths',
      'Focus attention on the top of your head',
      'Slowly move awareness down through each body part',
      'Notice sensations without judgment',
      'Spend extra time on areas holding tension',
      'End with awareness of your whole body as one',
    ],
    benefits: ['Reduces muscle tension', 'Improves body awareness', 'Promotes relaxation'],
    difficulty: 'Beginner',
  ),
  Exercise(
    id: 'e-9',
    name: 'Loving-Kindness Meditation',
    category: ExerciseCategory.meditation,
    durationSeconds: 600,
    steps: [
      'Sit comfortably and close your eyes',
      'Place a hand on your belly',
      'Silently repeat: "May I be healthy, may my baby be healthy"',
      'Extend the wish to your partner and family',
      'Extend the wish to all expectant parents',
      'Sit quietly for a few minutes',
    ],
    benefits: ['Strengthens parent-baby bond', 'Reduces anxiety', 'Cultivates compassion'],
    difficulty: 'Beginner',
  ),
  Exercise(
    id: 'e-10',
    name: 'Guided Visualization',
    category: ExerciseCategory.meditation,
    durationSeconds: 900,
    steps: [
      'Find a comfortable position and close your eyes',
      'Imagine a peaceful place — a garden, beach, or meadow',
      'Visualize every detail: colors, sounds, smells',
      'Imagine holding your baby in this peaceful place',
      'Feel warmth and safety surrounding you both',
      'When ready, slowly open your eyes',
    ],
    benefits: ['Prepares mentally for birth', 'Reduces labor anxiety', 'Promotes positive outlook'],
    difficulty: 'Beginner',
    illustrationUrl: 'https://picsum.photos/seed/ex10/400/250',
  ),
];

// ---------------------------------------------------------------------------
// UserPreferences
// ---------------------------------------------------------------------------

final mockUserPreferences = UserPreferences(
  dailyRemindersEnabled: true,
  checkupAlertsEnabled: true,
  selfCareNudgesEnabled: true,
  reducedMotionEnabled: false,
  units: WeightUnit.kg,
);
