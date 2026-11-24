export type Language = 'ar' | 'en';

export type TranslationKey =
  | 'appName'
  | 'tab.today'
  | 'tab.tasks'
  | 'tab.plans'
  | 'tab.stats'
  | 'tab.settings'
  | 'today.title'
  | 'today.subtitle'
  | 'today.noTasks'
  | 'today.noTasksDesc'
  | 'today.progress'
  | 'today.addTask'
  | 'tasks.title'
  | 'tasks.subtitle'
  | 'calendar.title'
  | 'calendar.subtitle'
  | 'calendar.noTasks'
  | 'tasks.noTasks'
  | 'tasks.noTasksDesc'
  | 'tasks.addTask'
  | 'tasks.search'
  | 'tasks.filter'
  | 'tasks.sortBy'
  | 'tasks.sort.date'
  | 'tasks.sort.priority'
  | 'tasks.sort.title'
  | 'tasks.sort.status'
  | 'tasks.group.overdue'
  | 'tasks.group.today'
  | 'tasks.group.tomorrow'
  | 'tasks.group.thisWeek'
  | 'tasks.group.later'
  | 'tasks.quickAdd'
  | 'tasks.quickAddPlaceholder'
  | 'tasks.quickAddTime'
  | 'tasks.detail'
  | 'tasks.edit'
  | 'tasks.new'
  | 'tasks.field.title'
  | 'tasks.field.description'
  | 'tasks.field.date'
  | 'tasks.field.time'
  | 'tasks.field.duration'
  | 'tasks.field.deadline'
  | 'tasks.field.priority'
  | 'tasks.field.category'
  | 'tasks.field.tags'
  | 'tasks.field.subtasks'
  | 'tasks.field.repeat'
  | 'tasks.field.notes'
  | 'tasks.field.customCategory'
  | 'tasks.priority.high'
  | 'tasks.priority.medium'
  | 'tasks.priority.low'
  | 'tasks.status.pending'
  | 'tasks.status.in_progress'
  | 'tasks.status.done'
  | 'tasks.status.postponed'
  | 'tasks.status.cancelled'
  | 'tasks.category.work'
  | 'tasks.category.study'
  | 'tasks.category.health'
  | 'tasks.category.personal'
  | 'tasks.category.family'
  | 'tasks.category.finance'
  | 'tasks.category.custom'
  | 'tasks.repeat.none'
  | 'tasks.repeat.daily'
  | 'tasks.repeat.weekly'
  | 'tasks.repeat.monthly'
  | 'tasks.repeat.custom'
  | 'tasks.repeat.days'
  | 'tasks.subtasks.add'
  | 'tasks.subtasks.empty'
  | 'tasks.minutes'
  | 'tasks.hours'
  | 'tasks.estimatedTime'
  | 'tasks.actualTime'
  | 'tasks.swipeComplete'
  | 'tasks.swipePostpone'
  | 'tasks.swipeDelete'
  | 'tasks.confirmDelete'
  | 'tasks.confirmDeleteMsg'
  | 'tasks.deleted'
  | 'tasks.selected'
  | 'tasks.bulkComplete'
  | 'tasks.dependsOn'
  | 'tasks.dependsOnHint'
  | 'tasks.dependsOnEmpty'
  | 'tasks.blockedTitle'
  | 'tasks.blockedMsg'
  | 'tasks.blockedCount'
  | 'tasks.postponed'
  | 'tasks.completed'
  | 'tasks.tags.placeholder'
  | 'pomodoro.title'
  | 'pomodoro.focus'
  | 'pomodoro.break'
  | 'pomodoro.start'
  | 'pomodoro.pause'
  | 'pomodoro.resume'
  | 'pomodoro.reset'
  | 'pomodoro.skip'
  | 'pomodoro.session'
  | 'pomodoro.sessions'
  | 'pomodoro.workDuration'
  | 'pomodoro.breakDuration'
  | 'pomodoro.customize'
  | 'pomodoro.completedSessions'
  | 'pomodoro.focusTime'
  | 'pomodoro.focusMinutes'
  | 'pomodoro.estimatedMinutes'
  | 'pomodoro.longBreakDuration'
  | 'pomodoro.longBreak'
  | 'pomodoro.autoStart'
  | 'alarm.title'
  | 'alarm.subtitle'
  | 'alarm.tone'
  | 'alarm.test'
  | 'alarm.bell'
  | 'alarm.digital'
  | 'alarm.siren'
  | 'alarm.chime'
  | 'alarm.pulse'
  | 'alarm.bellDesc'
  | 'alarm.digitalDesc'
  | 'alarm.sirenDesc'
  | 'alarm.chimeDesc'
  | 'alarm.pulseDesc'
  | 'plans.title'
  | 'plans.subtitle'
  | 'plans.noPlans'
  | 'plans.noPlansDesc'
  | 'plans.addPlan'
  | 'stats.title'
  | 'focus.title'
  | 'focus.subtitle'
  | 'focusScreen.chooseTask'
  | 'focusScreen.free'
  | 'focus.empty'
  | 'focus.emptyDesc'
  | 'focus.total'
  | 'focus.sessions'
  | 'focus.focus'
  | 'focus.break'
  | 'focus.viewHistory'
  | 'templates.title'
  | 'templates.subtitle'
  | 'templates.new'
  | 'templates.edit'
  | 'templates.empty'
  | 'templates.emptyDesc'
  | 'templates.use'
  | 'templates.fromTask'
  | 'templates.field.title'
  | 'templates.field.description'
  | 'templates.field.subtasks'
  | 'templates.field.tags'
  | 'templates.created'
  | 'templates.deleted'
  | 'routines.title'
  | 'routines.morning'
  | 'routines.evening'
  | 'routines.added'
  | 'stats.subtitle'
  | 'stats.noData'
  | 'stats.noDataDesc'
  | 'stats.completedTasks'
  | 'stats.activeGoals'
  | 'stats.streak'
  | 'stats.momentum'
  | 'stats.currentStreak'
  | 'stats.bestStreak'
  | 'stats.level'
  | 'stats.weeklyGoals'
  | 'stats.tasksShort'
  | 'stats.minutesShort'
  | 'stats.focusMap'
  | 'stats.focusMapHint'
  | 'stats.habitMap'
  | 'stats.habitMapHint'
  | 'stats.estimateAccuracy'
  | 'stats.avgEstimate'
  | 'stats.avgActual'
  | 'stats.suggestEstimate'
  | 'stats.bestFocusTime'
  | 'stats.badges'
  | 'badge.first_step.title'
  | 'badge.first_step.desc'
  | 'badge.deep_focus.title'
  | 'badge.deep_focus.desc'
  | 'badge.week_streak.title'
  | 'badge.week_streak.desc'
  | 'badge.habit_keeper.title'
  | 'badge.habit_keeper.desc'
  | 'badge.reflector.title'
  | 'badge.reflector.desc'
  | 'stats.weeklyProgress'
  | 'plans.goalsTab'
  | 'plans.plansTab'
  | 'plans.habitsTab'
  | 'plans.newGoal'
  | 'plans.newPlan'
  | 'plans.newHabit'
  | 'plans.goalTitle'
  | 'plans.goalDescription'
  | 'plans.goalMotivation'
  | 'plans.targetValue'
  | 'plans.targetUnit'
  | 'plans.targetDate'
  | 'plans.category'
  | 'plans.type'
  | 'plans.status'
  | 'plans.color'
  | 'plans.shortTerm'
  | 'plans.midTerm'
  | 'plans.longTerm'
  | 'plans.active'
  | 'plans.completed'
  | 'plans.paused'
  | 'plans.fromTemplate'
  | 'plans.blankGoal'
  | 'plans.startFromTemplate'
  | 'plans.templatePreview'
  | 'plans.milestones'
  | 'plans.linkedTasks'
  | 'plans.updateProgress'
  | 'plans.currentValue'
  | 'plans.autoProgress'
  | 'plans.manualProgress'
  | 'plans.noGoals'
  | 'plans.noGoalsDesc'
  | 'plans.noHabits'
  | 'plans.noHabitsDesc'
  | 'plans.noPlansList'
  | 'plans.noPlansListDesc'
  | 'plans.habitTitle'
  | 'plans.habitDescription'
  | 'plans.frequency'
  | 'plans.daily'
  | 'plans.weekly'
  | 'plans.custom'
  | 'plans.customDays'
  | 'plans.reminderTime'
  | 'plans.streak'
  | 'plans.bestStreak'
  | 'plans.today'
  | 'plans.doneToday'
  | 'plans.editGoal'
  | 'plans.editPlan'
  | 'plans.editHabit'
  | 'plans.deleteGoal'
  | 'plans.deletePlan'
  | 'plans.deleteHabit'
  | 'plans.planTitle'
  | 'plans.startDate'
  | 'plans.endDate'
  | 'plans.phases'
  | 'plans.tasks'
  | 'plans.goal'
  | 'plans.selectGoal'
  | 'plans.noGoal'
  | 'plans.addMilestone'
  | 'plans.milestoneTitle'
  | 'plans.tasksCreated'
  | 'plans.createTasks'
  | 'plans.weeklyPlan'
  | 'plans.monthlyPlan'
  | 'plans.customPlan'
  | 'stats.overview'
  | 'stats.completed'
  | 'stats.pending'
  | 'stats.inProgress'
  | 'stats.completionRate'
  | 'stats.totalTasks'
  | 'stats.focusTime'
  | 'stats.sessions'
  | 'stats.goalsCompleted'
  | 'stats.avgGoalProgress'
  | 'stats.habitConsistency'
  | 'stats.weeklyActivity'
  | 'stats.completionTrend'
  | 'stats.bestDay'
  | 'stats.categoryBreakdown'
  | 'stats.moodTrend'
  | 'stats.recentActivity'
  | 'stats.last7'
  | 'stats.last30'
  | 'stats.allTime'
  | 'stats.done'
  | 'stats.created'
  | 'stats.noActivity'
  | 'stats.noReviews'
  | 'tasks.noNotes'
  | 'tasks.addDetails'
  | 'tasks.mit'
  | 'tasks.mitLabel'
  | 'tasks.quickTime'
  | 'tasks.time.now'
  | 'tasks.time.later'
  | 'tasks.time.tomorrow'
  | 'tasks.time.morning'
  | 'tasks.time.evening'
  | 'tasks.time.clear'
  | 'tasks.reminder'
  | 'tasks.reminder.none'
  | 'tasks.reminder.default'
  | 'tasks.viewList'
  | 'tasks.viewMatrix'
  | 'tasks.scheduleConflict'
  | 'tasks.blocks'
  | 'tasks.blocksHint'
  | 'tasks.conflictBanner'
  | 'tasks.fixConflicts'
  | 'tasks.conflictsFixed'
  | 'tasks.fixedCount'
  | 'tasks.impact'
  | 'tasks.impactHint'
  | 'tasks.quickWins'
  | 'tasks.quickWinsHint'
  | 'matrix.do'
  | 'matrix.doHint'
  | 'matrix.schedule'
  | 'matrix.scheduleHint'
  | 'matrix.delegate'
  | 'matrix.delegateHint'
  | 'matrix.eliminate'
  | 'matrix.eliminateHint'
  | 'matrix.empty'
  | 'search.title'
  | 'search.subtitle'
  | 'search.placeholder'
  | 'search.noResults'
  | 'search.tasks'
  | 'search.goals'
  | 'search.plans'
  | 'search.habits'
  | 'search.reviews'
  | 'data.title'
  | 'data.subtitle'
  | 'data.export'
  | 'data.exportDesc'
  | 'data.download'
  | 'data.import'
  | 'data.importDesc'
  | 'data.importHint'
  | 'data.apply'
  | 'data.success'
  | 'data.error'
  | 'data.clear'
  | 'data.clearDesc'
  | 'data.copied'
  | 'data.health'
  | 'data.healthDesc'
  | 'data.healthRun'
  | 'data.healthScore'
  | 'data.healthRecords'
  | 'data.healthClean'
  | 'data.healthRepair'
  | 'data.healthRepaired'
  | 'data.health.brokenDeps'
  | 'data.health.cycles'
  | 'data.health.duplicates'
  | 'data.health.invalidDates'
  | 'data.health.deadlineBeforeDate'
  | 'data.health.orphanReminders'
  | 'data.health.orphanPomodoros'
  | 'data.health.habitConfig'
  | 'data.health.planLinks'
  | 'data.health.conflicts'
  | 'data.health.overdue'
  | 'planning.auto'
  | 'planning.autoDesc'
  | 'planning.scheduled'
  | 'planning.noCandidates'
  | 'weekly.title'
  | 'weekly.subtitle'
  | 'weekly.weekOf'
  | 'weekly.completed'
  | 'weekly.rate'
  | 'weekly.goals'
  | 'weekly.habits'
  | 'weekly.moods'
  | 'weekly.reflection'
  | 'weekly.well'
  | 'weekly.improve'
  | 'weekly.note'
  | 'weekly.save'
  | 'weekly.saved'
  | 'weekly.noData'
  | 'weekly.highlights'
  | 'weekly.previous'
  | 'weekly.prompt.well1'
  | 'weekly.prompt.well2'
  | 'weekly.prompt.improve1'
  | 'weekly.prompt.improve2'
  | 'weekly.prompt.note1'
  | 'weekly.summary'
  | 'weekly.summaryHint'
  | 'weekly.generate'
  | 'weekly.copySummary'
  | 'weekly.summaryCopied'
  | 'weekly.summaryInNote'
  | 'settings.system'
  | 'settings.dataExport'
  | 'settings.dataExportDesc'
  | 'settings.weeklyGoals'
  | 'settings.tabOrder'
  | 'settings.tabOrderDesc'
  | 'settings.weeklyTasksGoal'
  | 'settings.weeklyFocusGoal'
  | 'settings.search'
  | 'settings.searchDesc'
  | 'settings.weeklyReview'
  | 'settings.weeklyReviewDesc'
  | 'notfound.title'
  | 'notfound.msg'
  | 'notfound.back'
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.language'
  | 'settings.theme'
  | 'settings.lightMode'
  | 'settings.darkMode'
  | 'settings.colors'
  | 'settings.colorsDesc'
  | 'settings.about'
  | 'settings.aboutDesc'
  | 'settings.version'
  | 'update.check'
  | 'update.checkDesc'
  | 'update.checking'
  | 'update.available'
  | 'update.current'
  | 'update.latest'
  | 'update.notes'
  | 'update.download'
  | 'update.later'
  | 'update.ok'
  | 'update.noUpdate'
  | 'update.error'
  | 'update.downloading'
  | 'update.installing'
  | 'update.downloadFailed'
  | 'update.retry'
  | 'update.openBrowser'
  | 'update.installHint'
  | 'common.add'
  | 'common.edit'
  | 'common.delete'
  | 'common.cancel'
  | 'common.undo'
  | 'common.save'
  | 'common.confirm'
  | 'common.search'
  | 'common.loading'
  | 'common.error'
  | 'common.retry'
  | 'common.all'
  | 'common.none'
  | 'common.back'
  | 'common.min'
  | 'empty.comingSoon'
  | 'empty.comingSoonDesc'
  | 'notifications.title'
  | 'notifications.subtitle'
  | 'notifications.enabled'
  | 'notifications.enableNotifs'
  | 'notifications.enableNotifsDesc'
  | 'notifications.taskReminders'
  | 'notifications.taskRemindersDesc'
  | 'notifications.defaultReminders'
  | 'notifications.reminderAtTime'
  | 'notifications.reminder5'
  | 'notifications.reminder10'
  | 'notifications.reminder15'
  | 'notifications.reminder30'
  | 'notifications.reminder60'
  | 'notifications.reminderCustom'
  | 'notifications.morningSummary'
  | 'notifications.morningSummaryDesc'
  | 'notifications.morningTime'
  | 'notifications.eveningReview'
  | 'notifications.eveningReviewDesc'
  | 'notifications.eveningTime'
  | 'notifications.overdueReminder'
  | 'notifications.overdueReminderDesc'
  | 'notifications.overdueTime'
  | 'notifications.quietHours'
  | 'notifications.quietHoursDesc'
  | 'notifications.quietStart'
  | 'notifications.quietEnd'
  | 'notifications.sound'
  | 'notifications.soundDesc'
  | 'notifications.vibration'
  | 'notifications.vibrationDesc'
  | 'notifications.habitReminders'
  | 'notifications.habitRemindersDesc'
  | 'notifications.habitTime'
  | 'notifications.smartNudge'
  | 'notifications.smartNudgeDesc'
  | 'notifications.smartNudgeTime'
  | 'notifications.permissionDenied'
  | 'notifications.permissionDeniedDesc'
  | 'notifications.grantPermission'
  | 'notifications.testNotification'
  | 'notifications.testSent'
  | 'notifications.sectionGeneral'
  | 'notifications.sectionSchedule'
  | 'notifications.sectionQuiet'
  | 'notifications.sectionSound'
  | 'notifications.minutesBefore'
  | 'notifications.customMinutes'
  | 'notifications.save'
  | 'notifications.weeklyBackup'
  | 'notifications.weeklyBackupDesc'
  | 'notifications.weeklyBackupTime'
  | 'filters.saved'
  | 'filters.save'
  | 'filters.namePlaceholder'
  | 'filters.untitled'
  | 'today.greeting.morning'
  | 'today.greeting.afternoon'
  | 'today.greeting.evening'
  | 'today.greeting.night'
  | 'today.date.format'
  | 'today.tasksCount'
  | 'today.completedCount'
  | 'today.remainingCount'
  | 'today.timeline'
  | 'today.list'
  | 'today.reorderHint'
  | 'today.mit'
  | 'today.mitDesc'
  | 'today.noMIT'
  | 'today.markMIT'
  | 'today.unmarkMIT'
  | 'today.habits'
  | 'today.habitsHint'
  | 'today.startFocus'
  | 'today.suggestion'
  | 'today.suggestionDesc'
  | 'today.start'
  | 'today.dailyReview'
  | 'today.quickAdd'
  | 'today.noTimeTasks'
  | 'today.allDay'
  | 'today.now'
  | 'today.upcoming'
  | 'today.past'
  | 'review.title'
  | 'review.subtitle'
  | 'review.completed'
  | 'review.notCompleted'
  | 'review.postponed'
  | 'review.moveTomorrow'
  | 'review.moveDate'
  | 'review.suggestTime'
  | 'review.markDone'
  | 'review.cancelTask'
  | 'review.moveAllTomorrow'
  | 'review.moveAllConfirm'
  | 'review.moveAllConfirmMsg'
  | 'review.reflection'
  | 'review.mood'
  | 'review.mood.great'
  | 'review.mood.good'
  | 'review.mood.okay'
  | 'review.mood.bad'
  | 'review.whatWentWell'
  | 'review.whatToImprove'
  | 'review.note'
  | 'review.saveReflection'
  | 'review.reflectionSaved'
  | 'review.noTasksToday'
  | 'review.noTasksTodayDesc'
  | 'planner.title'
  | 'planner.subtitle'
  | 'planner.week'
  | 'planner.month'
  | 'planner.today'
  | 'planner.noTasks'
  | 'planner.workload.light'
  | 'planner.workload.balanced'
  | 'planner.workload.overloaded'
  | 'planner.tasks'
  | 'planner.dragHint'
  | 'rollover.rolled'
  | 'rollover.times'
  | 'rollover.tooMany'
  | 'rollover.tooManyMsg'
  | 'rollover.split'
  | 'rollover.changePriority'
  | 'rollover.delete'
  | 'rollover.dismiss'
  | 'settings.autoRollover'
  | 'settings.autoRolloverDesc'
  | 'settings.hijriDate'
  | 'settings.hijriDateDesc'
  | 'settings.simpleMode'
  | 'settings.simpleModeDesc'
  | 'settings.fontScaleTitle'
  | 'settings.fontScaleSubtitle'
  | 'settings.fontScaleNormal'
  | 'settings.fontScaleSystem'
  | 'settings.fontScaleDetected'
  | 'settings.fontScaleDetectedDesc'
  | 'settings.fontScaleSize'
  | 'settings.fontScaleCompact'
  | 'settings.fontScaleDefault'
  | 'settings.fontScaleComfortable';

type Translations = Record<TranslationKey, string>;

export const translations: Record<Language, Translations> = {
  ar: {
    'appName': 'وقتي',
    'tab.today': 'اليوم',
    'tab.tasks': 'المهام',
    'tab.plans': 'الخطط',
    'tab.stats': 'الإحصاء',
    'tab.settings': 'الإعدادات',
    'today.title': 'اليوم',
    'today.subtitle': 'لنبدأ يوماً منتجاً',
    'today.noTasks': 'لا توجد مهام اليوم',
    'today.noTasksDesc': 'أضف مهمة جديدة لتبدأ يومك',
    'today.progress': 'تقدم اليوم',
    'today.addTask': 'إضافة مهمة',
    'tasks.title': 'المهام',
    'tasks.subtitle': 'كل مهامك في مكان واحد',
    'calendar.title': 'التقويم',
    'calendar.subtitle': 'عرض المهام حسب التاريخ',
    'calendar.noTasks': 'لا توجد مهام في هذا اليوم',
    'tasks.noTasks': 'لا توجد مهام',
    'tasks.noTasksDesc': 'أضف مهمة جديدة لتنظيم وقتك',
    'tasks.addTask': 'إضافة مهمة',
    'tasks.search': 'بحث عن مهمة...',
    'tasks.filter': 'تصفية',
    'tasks.sortBy': 'ترتيب',
    'tasks.sort.date': 'التاريخ',
    'tasks.sort.priority': 'الأولوية',
    'tasks.sort.title': 'العنوان',
    'tasks.sort.status': 'الحالة',
    'tasks.group.overdue': 'متأخرة',
    'tasks.group.today': 'اليوم',
    'tasks.group.tomorrow': 'غداً',
    'tasks.group.thisWeek': 'هذا الأسبوع',
    'tasks.group.later': 'لاحقاً',
    'tasks.quickAdd': 'إضافة سريعة',
    'tasks.quickAddPlaceholder': 'ما المهمة؟',
    'tasks.quickAddTime': 'الوقت',
    'tasks.detail': 'تفاصيل المهمة',
    'tasks.edit': 'تعديل المهمة',
    'tasks.new': 'مهمة جديدة',
    'tasks.field.title': 'العنوان',
    'tasks.field.description': 'الوصف',
    'tasks.field.date': 'التاريخ',
    'tasks.field.time': 'وقت البدء',
    'tasks.field.duration': 'المدة المقدرة (دقيقة)',
    'tasks.field.deadline': 'الموعد النهائي',
    'tasks.field.priority': 'الأولوية',
    'tasks.field.category': 'الفئة',
    'tasks.field.tags': 'الوسوم',
    'tasks.field.subtasks': 'المهام الفرعية',
    'tasks.field.repeat': 'التكرار',
    'tasks.field.notes': 'ملاحظات',
    'tasks.field.customCategory': 'فئة مخصصة',
    'tasks.priority.high': 'عالية',
    'tasks.priority.medium': 'متوسطة',
    'tasks.priority.low': 'منخفضة',
    'tasks.status.pending': 'قيد الانتظار',
    'tasks.status.in_progress': 'قيد التنفيذ',
    'tasks.status.done': 'مكتملة',
    'tasks.status.postponed': 'مؤجلة',
    'tasks.status.cancelled': 'ملغاة',
    'tasks.category.work': 'عمل',
    'tasks.category.study': 'دراسة',
    'tasks.category.health': 'صحة',
    'tasks.category.personal': 'شخصي',
    'tasks.category.family': 'عائلة',
    'tasks.category.finance': 'مالية',
    'tasks.category.custom': 'مخصص',
    'tasks.repeat.none': 'بدون تكرار',
    'tasks.repeat.daily': 'يومي',
    'tasks.repeat.weekly': 'أسبوعي',
    'tasks.repeat.monthly': 'شهري',
    'tasks.repeat.custom': 'أيام مخصصة',
    'tasks.repeat.days': 'أيام التكرار',
    'tasks.subtasks.add': 'إضافة مهمة فرعية',
    'tasks.subtasks.empty': 'لا توجد مهام فرعية',
    'tasks.minutes': 'دقيقة',
    'tasks.hours': 'ساعة',
    'tasks.estimatedTime': 'الوقت المقدر',
    'tasks.actualTime': 'الوقت الفعلي',
    'tasks.swipeComplete': 'إكمال',
    'tasks.swipePostpone': 'تأجيل',
    'tasks.swipeDelete': 'حذف',
    'tasks.confirmDelete': 'تأكيد الحذف',
    'tasks.confirmDeleteMsg': 'هل أنت متأكد من حذف هذه المهمة؟',
    'tasks.deleted': 'تم حذف',
    'tasks.selected': 'محدد',
    'tasks.bulkComplete': 'إكمال المحدد',
    'tasks.dependsOn': 'يعتمد على مهام',
    'tasks.dependsOnHint': 'لازم تتكمل المهام دي قبل ما تتعمل المهمة',
    'tasks.dependsOnEmpty': 'مفيش مهام تانية لسه',
    'tasks.blockedTitle': 'المهمة مستنية',
    'tasks.blockedMsg': 'كمّل المهام دي الأول:',
    'tasks.blockedCount': 'مهام متوقفة بسبب اعتماديات',
    'tasks.postponed': 'تم التأجيل',
    'tasks.completed': 'تم الإكمال',
    'tasks.tags.placeholder': 'أضف وسم واضغط مسافة',
    'pomodoro.title': 'مؤقت بومودورو',
    'pomodoro.focus': 'تركيز',
    'pomodoro.break': 'استراحة',
    'pomodoro.start': 'ابدأ',
    'pomodoro.pause': 'إيقاف',
    'pomodoro.resume': 'استئناف',
    'pomodoro.reset': 'إعادة',
    'pomodoro.skip': 'تخطي',
    'pomodoro.session': 'جلسة',
    'pomodoro.sessions': 'جلسات',
    'pomodoro.workDuration': 'مدة التركيز (دقيقة)',
    'pomodoro.breakDuration': 'مدة الاستراحة (دقيقة)',
    'pomodoro.customize': 'تخصيص المؤقت',
    'pomodoro.completedSessions': 'الجلسات المكتملة',
    'pomodoro.focusTime': 'وقت التركيز',
    'pomodoro.focusMinutes': 'دقيقة تركيز',
    'pomodoro.estimatedMinutes': 'دقيقة مقدرة',
    'pomodoro.longBreakDuration': 'الاستراحة الطويلة (بعد 4 جلسات)',
    'pomodoro.longBreak': 'استراحة طويلة',
    'pomodoro.autoStart': 'بدء المرحلة التالية تلقائياً',
    'alarm.title': 'منبه المهمة',
    'alarm.subtitle': 'صوت عالي واهتزاز مختلف عند الموعد',
    'alarm.tone': 'نغمة المنبه',
    'alarm.test': 'جرّب',
    'alarm.bell': 'جرس',
    'alarm.digital': 'رقمي',
    'alarm.siren': 'صفارة',
    'alarm.chime': 'أجراس',
    'alarm.pulse': 'نبضات',
    'alarm.bellDesc': 'جرس كلاسيكي مع اهتزاز متوسط',
    'alarm.digitalDesc': 'بيبات سريعة مع اهتزاز متقطع',
    'alarm.sirenDesc': 'صفارة صاعدة مع اهتزاز قوي',
    'alarm.chimeDesc': 'لحن ممتع مع اهتزاز متدرج',
    'alarm.pulseDesc': 'نبضات قوية مع اهتزاز عميق',
    'plans.title': 'الخطط والأهداف',
    'plans.subtitle': 'خطط لنجاحك',
    'plans.noPlans': 'لا توجد خطط بعد',
    'plans.noPlansDesc': 'أنشئ خطة أو هدفاً جديداً للبدء',
    'plans.addPlan': 'إضافة خطة',
    'stats.title': 'الإحصائيات',
    'focus.title': 'سجل التركيز',
    'focus.subtitle': 'كل جلسات التركيز والاستراحة',
    'focusScreen.chooseTask': 'اربط التركيز بمهمة (اختياري)',
    'focusScreen.free': 'تركيز حر',
    'focus.empty': 'مفيش جلسات بعد',
    'focus.emptyDesc': 'ابدأ جلسة تركيز من أي مهمة',
    'focus.total': 'إجمالي التركيز',
    'focus.sessions': 'الجلسات',
    'focus.focus': 'تركيز',
    'focus.break': 'استراحة',
    'focus.viewHistory': 'سجل التركيز',
    'templates.title': 'قوالب المهام',
    'templates.subtitle': 'مهام جاهزة بتتكرر معاك',
    'templates.new': 'قالب جديد',
    'templates.edit': 'تعديل القالب',
    'templates.empty': 'مفيش قوالب بعد',
    'templates.emptyDesc': 'أنشئ قالب للمهام اللي بتتكرر كتير',
    'templates.use': 'استخدم',
    'templates.fromTask': 'من مهمة موجودة',
    'templates.field.title': 'اسم القالب',
    'templates.field.description': 'الوصف',
    'templates.field.subtasks': 'الخطوات (سطر لكل خطوة)',
    'templates.field.tags': 'الوسوم (مفصولة بفاصلة)',
    'templates.created': 'تم حفظ القالب',
    'templates.deleted': 'تم حذف القالب',
    'routines.title': 'روتين جاهز',
    'routines.morning': 'روتين الصباح',
    'routines.evening': 'روتين المساء',
    'routines.added': 'اتضافت مهام الروتين ليومك',
    'stats.subtitle': 'تتبع تقدمك وإنجازاتك',
    'stats.noData': 'لا توجد بيانات بعد',
    'stats.noDataDesc': 'ابدأ بإضافة المهام والأهداف لرؤية إحصائياتك',
    'stats.completedTasks': 'المهام المكتملة',
    'stats.activeGoals': 'الأهداف النشطة',
    'stats.streak': 'أيام متتالية',
    'stats.momentum': 'الزخم والإنجاز',
    'stats.currentStreak': 'الحالية',
    'stats.bestStreak': 'الأفضل',
    'stats.level': 'المستوى',
    'stats.weeklyGoals': 'أهداف هذا الأسبوع',
    'stats.tasksShort': 'مهام',
    'stats.minutesShort': 'دقائق',
    'stats.focusMap': 'خريطة التركيز',
    'stats.focusMapHint': 'كل مربع = يوم، واللون الأغمق يعني جلسات أكثر',
    'stats.habitMap': 'خريطة العادات',
    'stats.habitMapHint': 'كل مربع = يوم، واللون الأغمق يعني عادات أكثر اكتملت',
    'stats.estimateAccuracy': 'دقة تقدير الوقت',
    'stats.avgEstimate': 'متوسط المقدّر',
    'stats.avgActual': 'متوسط الفعلي',
    'stats.suggestEstimate': 'الأنسب لك',
    'stats.bestFocusTime': 'أفضل أوقات التركيز',
    'stats.badges': 'شارات الإنجاز',
    'badge.first_step.title': 'أول خطوة',
    'badge.first_step.desc': 'أكمل أول مهمة',
    'badge.deep_focus.title': 'تركيز عميق',
    'badge.deep_focus.desc': '١٢٠ دقيقة تركيز',
    'badge.week_streak.title': 'أسبوع متتالي',
    'badge.week_streak.desc': '٧ أيام إنجاز',
    'badge.habit_keeper.title': 'حارس العادات',
    'badge.habit_keeper.desc': '١٠ تسجيلات عادات',
    'badge.reflector.title': 'مراجع دائم',
    'badge.reflector.desc': '٣ مراجعات يومية',
    'stats.weeklyProgress': 'التقدم الأسبوعي',
    'plans.goalsTab': 'الأهداف',
    'plans.plansTab': 'الخطط',
    'plans.habitsTab': 'العادات',
    'plans.newGoal': 'هدف جديد',
    'plans.newPlan': 'خطة جديدة',
    'plans.newHabit': 'عادة جديدة',
    'plans.goalTitle': 'عنوان الهدف',
    'plans.goalDescription': 'وصف الهدف',
    'plans.goalMotivation': 'لماذا تريد تحقيقه؟',
    'plans.targetValue': 'القيمة المستهدفة',
    'plans.targetUnit': 'الوحدة (مثلاً: كتاب)',
    'plans.targetDate': 'تاريخ الهدف',
    'plans.category': 'الفئة',
    'plans.type': 'نوع الهدف',
    'plans.status': 'الحالة',
    'plans.color': 'اللون',
    'plans.shortTerm': 'قصير المدى',
    'plans.midTerm': 'متوسط المدى',
    'plans.longTerm': 'طويل المدى',
    'plans.active': 'نشط',
    'plans.completed': 'مكتمل',
    'plans.paused': 'متوقف',
    'plans.fromTemplate': 'ابدأ من قالب جاهز',
    'plans.blankGoal': 'هدف فارغ',
    'plans.startFromTemplate': 'إنشاء من القالب',
    'plans.templatePreview': 'سيتم إنشاء مراحل ومهام مقترحة تلقائياً',
    'plans.milestones': 'المراحل',
    'plans.linkedTasks': 'المهام المرتبطة',
    'plans.updateProgress': 'تحديث التقدم',
    'plans.currentValue': 'القيمة الحالية',
    'plans.autoProgress': 'تلقائي من المهام',
    'plans.manualProgress': 'تحديث يدوي',
    'plans.noGoals': 'لا توجد أهداف بعد',
    'plans.noGoalsDesc': 'أنشئ هدفاً أو اختر قالباً جاهزاً للبدء',
    'plans.noHabits': 'لا توجد عادات بعد',
    'plans.noHabitsDesc': 'أضف عادة يومية أو أسبوعية لتتبع سلسلتك',
    'plans.noPlansList': 'لا توجد خطط بعد',
    'plans.noPlansListDesc': 'اربط خطة بهدف لتقسيم العمل إلى مراحل',
    'plans.habitTitle': 'اسم العادة',
    'plans.habitDescription': 'وصف العادة',
    'plans.frequency': 'التكرار',
    'plans.daily': 'يومي',
    'plans.weekly': 'أسبوعي',
    'plans.custom': 'مخصص',
    'plans.customDays': 'الأيام المحددة',
    'plans.reminderTime': 'وقت التذكير',
    'plans.streak': 'سلسلة',
    'plans.bestStreak': 'أفضل سلسلة',
    'plans.today': 'اليوم',
    'plans.doneToday': 'تم اليوم',
    'plans.editGoal': 'تعديل الهدف',
    'plans.editPlan': 'تعديل الخطة',
    'plans.editHabit': 'تعديل العادة',
    'plans.deleteGoal': 'حذف الهدف',
    'plans.deletePlan': 'حذف الخطة',
    'plans.deleteHabit': 'حذف العادة',
    'plans.planTitle': 'عنوان الخطة',
    'plans.startDate': 'تاريخ البداية',
    'plans.endDate': 'تاريخ النهاية',
    'plans.phases': 'المراحل',
    'plans.tasks': 'المهام',
    'plans.goal': 'الهدف',
    'plans.selectGoal': 'اختر هدفاً',
    'plans.noGoal': 'بدون هدف',
    'plans.addMilestone': 'إضافة مرحلة',
    'plans.milestoneTitle': 'عنوان المرحلة',
    'plans.tasksCreated': 'مهام مقترحة',
    'plans.createTasks': 'إنشاء المهام المقترحة',
    'plans.weeklyPlan': 'خطة أسبوعية',
    'plans.monthlyPlan': 'خطة شهرية',
    'plans.customPlan': 'خطة مخصصة',
    'stats.overview': 'نظرة عامة',
    'stats.completed': 'مكتملة',
    'stats.pending': 'قيد الانتظار',
    'stats.inProgress': 'قيد التنفيذ',
    'stats.completionRate': 'نسبة الإنجاز',
    'stats.totalTasks': 'إجمالي المهام',
    'stats.focusTime': 'وقت التركيز',
    'stats.sessions': 'جلسات التركيز',
    'stats.goalsCompleted': 'أهداف مكتملة',
    'stats.avgGoalProgress': 'متوسط تقدم الأهداف',
    'stats.habitConsistency': 'انتظام العادات',
    'stats.weeklyActivity': 'النشاط الأسبوعي',
    'stats.completionTrend': 'منحنى الإنجاز',
    'stats.bestDay': 'أفضل يوم',
    'stats.categoryBreakdown': 'توزيع المهام',
    'stats.moodTrend': 'المزاج خلال الفترة',
    'stats.recentActivity': 'آخر الإنجازات',
    'stats.last7': 'آخر 7 أيام',
    'stats.last30': 'آخر 30 يوماً',
    'stats.allTime': 'كل الفترات',
    'stats.done': 'منجز',
    'stats.created': 'تم إنشاؤها',
    'stats.noActivity': 'لا يوجد نشاط في هذه الفترة',
    'stats.noReviews': 'لا توجد مراجعات يومية بعد',
    'tasks.noNotes': 'لا توجد ملاحظات بعد',
    'tasks.addDetails': 'تفاصيل أكثر',
    'tasks.mit': 'الأهم اليوم',
    'tasks.mitLabel': 'أهم مهمة',
    'tasks.quickTime': 'وقت سريع',
    'tasks.time.now': 'الآن',
    'tasks.time.later': 'بعد ساعة',
    'tasks.time.tomorrow': 'الغد ٩ ص',
    'tasks.time.morning': 'صباحاً ٩',
    'tasks.time.evening': 'مساءً ٧',
    'tasks.time.clear': 'بدون وقت',
    'tasks.reminder': 'تذكير هذه المهمة',
    'tasks.reminder.none': 'بدون تذكير',
    'tasks.reminder.default': 'الافتراضي',
    'tasks.viewList': 'قائمة',
    'tasks.viewMatrix': 'مصفوفة',
    'tasks.scheduleConflict': 'تعارض وقت',
    'tasks.blocks': 'مهام تتوقف على هذه المهمة',
    'tasks.blocksHint': 'لن تكتمل هذه المهام قبل إكمال المهمة الحالية',
    'tasks.conflictBanner': 'فيه تعارض بين مواعيد المهام',
    'tasks.fixConflicts': 'اضغط لترتيب الوقت تلقائيًا',
    'tasks.conflictsFixed': 'تم ترتيب المواعيد',
    'tasks.fixedCount': 'عدد المهام ال اتعدّلت',
    'tasks.impact': 'الأكثر تأثيرًا',
    'tasks.impactHint': 'إنجازها يفتح مهام تانية',
    'tasks.quickWins': 'انتصارات سريعة',
    'tasks.quickWinsHint': 'مهام صغيرة وعاجلة أو مهمة',
    'matrix.do': 'افعلها الآن',
    'matrix.doHint': 'عاجلة ومهمة',
    'matrix.schedule': 'جدولها',
    'matrix.scheduleHint': 'مهمة وتحتاج وقت',
    'matrix.delegate': 'فوّضها',
    'matrix.delegateHint': 'عاجلة وأقل أهمية',
    'matrix.eliminate': 'ألغها',
    'matrix.eliminateHint': 'أقل أهمية وغير عاجلة',
    'matrix.empty': 'لا توجد مهام لتصنيفها',
    'search.title': 'بحث شامل',
    'search.subtitle': 'ابحث في كل بياناتك',
    'search.placeholder': 'ابحث عن مهمة، هدف، خطة، عادة...',
    'search.noResults': 'لا توجد نتائج مطابقة',
    'search.tasks': 'المهام',
    'search.goals': 'الأهداف',
    'search.plans': 'الخطط',
    'search.habits': 'العادات',
    'search.reviews': 'المراجعات',
    'data.title': 'النسخ الاحتياطي والبيانات',
    'data.subtitle': 'صدّر بياناتك أو استعدها',
    'data.export': 'تصدير البيانات',
    'data.exportDesc': 'حمّل نسخة من كل بياناتك بصيغة JSON',
    'data.download': 'تنزيل الملف',
    'data.import': 'استيراد البيانات',
    'data.importDesc': 'الصق محتوى ملف النسخ الاحتياطي لاستعادة بياناتك',
    'data.importHint': 'سيلصق النص هنا محتوى ملف JSON',
    'data.apply': 'استيراد',
    'data.success': 'تمت العملية بنجاح',
    'data.error': 'تعذرت العملية، تحقق من صيغة البيانات',
    'data.clear': 'مسح كل البيانات',
    'data.clearDesc': 'حذف جميع المهام والأهداف والخطط والعادات نهائياً',
    'data.copied': 'تم النسخ',
    'data.health': 'فحص صحة البيانات',
    'data.healthDesc': 'اكتشف الروابط المكسورة والتعارضات قبل ما تصدّر نسخة',
    'data.healthRun': 'تشغيل الفحص',
    'data.healthScore': 'درجة سلامة البيانات',
    'data.healthRecords': 'سجل',
    'data.healthClean': 'بياناتك سليمة، مفيش مشاكل',
    'data.healthRepair': 'إصلاح تلقائي آمن',
    'data.healthRepaired': 'اتصلحت الروابط المتعطلة',
    'data.health.brokenDeps': 'روابط تبعية مفقودة',
    'data.health.cycles': 'دورات في التبعيات',
    'data.health.duplicates': 'معرفات مكررة',
    'data.health.invalidDates': 'تواريخ غير صالحة',
    'data.health.deadlineBeforeDate': 'موعد نهائي قبل تاريخ المهمة',
    'data.health.orphanReminders': 'تذكيرات لمهام محذوفة',
    'data.health.orphanPomodoros': 'جلسات تركيز لمهام محذوفة',
    'data.health.habitConfig': 'عادات بإعدادات غير مكتملة',
    'data.health.planLinks': 'روابط خطط لمهام محذوفة',
    'data.health.conflicts': 'تعارضات في المواعيد',
    'data.health.overdue': 'مهام متأخرة',
    'planning.auto': 'ترتيب تلقائي',
    'planning.autoDesc': 'وزّع المهام غير المجدولة على الأيام المتاحة حسب الأولوية',
    'planning.scheduled': 'تم ترتيب المهام',
    'planning.noCandidates': 'لا توجد مهام تحتاج ترتيباً',
    'weekly.title': 'المراجعة الأسبوعية',
    'weekly.subtitle': 'تأمل في أسبوعك وخطط لما بعده',
    'weekly.weekOf': 'أسبوع',
    'weekly.completed': 'مهام مكتملة',
    'weekly.rate': 'نسبة الإنجاز',
    'weekly.goals': 'تقدم الأهداف',
    'weekly.habits': 'انتظام العادات',
    'weekly.moods': 'المزاج',
    'weekly.reflection': 'تأملاتك',
    'weekly.well': 'ما الذي نجح؟',
    'weekly.improve': 'ما الذي يمكن تحسينه؟',
    'weekly.note': 'ملاحظات',
    'weekly.save': 'حفظ المراجعة',
    'weekly.saved': 'تم حفظ المراجعة',
    'weekly.noData': 'لا توجد بيانات كافية لهذا الأسبوع',
    'weekly.highlights': 'أبرز الإنجازات',
    'weekly.previous': 'مراجعات سابقة',
    'weekly.prompt.well1': 'أهم إنجاز هذا الأسبوع كان...',
    'weekly.prompt.well2': 'شيء فخورت به...',
    'weekly.prompt.improve1': 'أكبر عائق تكرر كان...',
    'weekly.prompt.improve2': 'هغيّر كدة الأسبوع الجاي...',
    'weekly.prompt.note1': 'أولوية الأسبوع الجاي...',
    'weekly.summary': 'ملخص جاهز',
    'weekly.summaryHint': 'نص مختصر من أرقام الأسبوع تقدر تشاركه أو تحفظه',
    'weekly.generate': 'توليد الملخص',
    'weekly.copySummary': 'نسخ / مشاركة الملخص',
    'weekly.summaryCopied': 'اتنسخ الملخص',
    'weekly.summaryInNote': 'اتضاف الملخص للملاحظات',
    'settings.system': 'حسب النظام',
    'settings.dataExport': 'البيانات والنسخ الاحتياطي',
    'settings.dataExportDesc': 'تصدير واستيراد بيانات التطبيق',
    'settings.weeklyGoals': 'الأهداف الأسبوعية',
    'settings.tabOrder': 'ترتيب التبويبات',
    'settings.tabOrderDesc': 'حرّك التبويبات بالأسهم',
    'settings.weeklyTasksGoal': 'هدف المهام أسبوعياً',
    'settings.weeklyFocusGoal': 'هدف التركيز (دقيقة)',
    'settings.search': 'البحث الشامل',
    'settings.searchDesc': 'ابحث في كل المهام والأهداف والخطط',
    'settings.weeklyReview': 'المراجعة الأسبوعية',
    'settings.weeklyReviewDesc': 'راجع أسبوعك وسجل تأملاتك',
    'notfound.title': 'الصفحة غير موجودة',
    'notfound.msg': 'يبدو أنك وصلت إلى صفحة غير موجودة',
    'notfound.back': 'العودة للرئيسية',
    'settings.title': 'الإعدادات',
    'settings.subtitle': 'خصص تجربتك',
    'settings.language': 'اللغة',
    'settings.theme': 'المظهر',
    'settings.lightMode': 'الوضع الفاتح',
    'settings.darkMode': 'الوضع الداكن',
    'settings.colors': 'ألوان التطبيق',
    'settings.colorsDesc': 'اختر لوحة الألوان التي تناسب ذوقك — يتغير التطبيق فورًا',
    'settings.about': 'حول التطبيق',
    'settings.aboutDesc': 'وقتي - تطبيق إدارة الوقت',
    'settings.version': 'الإصدار',
    'update.check': 'التحقق من التحديثات',
    'update.checkDesc': 'ابحث عن نسخة أحدث وحمّلها من داخل التطبيق',
    'update.checking': 'جاري البحث عن تحديث...',
    'update.available': 'تحديث جديد متاح',
    'update.current': 'الإصدار الحالي',
    'update.latest': 'الأحدث',
    'update.notes': 'ما الجديد',
    'update.download': 'تحميل التحديث',
    'update.later': 'لاحقًا',
    'update.ok': 'حسنًا',
    'update.noUpdate': 'أنت تستخدم أحدث إصدار بالفعل',
    'update.error': 'تعذّر البحث عن التحديثات. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.',
    'update.downloading': 'جاري تحميل التحديث...',
    'update.installing': 'جاري فتح المُثبّت...',
    'update.downloadFailed': 'فشل تحميل التحديث. تأكد من الاتصال وحاول مرة أخرى.',
    'update.retry': 'إعادة المحاولة',
    'update.openBrowser': 'فتح المتصفح بدلاً من ذلك',
    'update.installHint': 'لو طلب النظام السماح بتثبيت تطبيقات غير معروفة، فعّل الخيار وارجع لإتمام التثبيت.',
    'common.add': 'إضافة',
    'common.edit': 'تعديل',
    'common.delete': 'حذف',
    'common.cancel': 'إلغاء',
    'common.undo': 'تراجع',
    'common.save': 'حفظ',
    'common.confirm': 'تأكيد',
    'common.search': 'بحث',
    'common.loading': 'جاري التحميل...',
    'common.error': 'حدث خطأ',
    'common.retry': 'إعادة المحاولة',
    'common.all': 'الكل',
    'common.none': 'لا شيء',
    'common.back': 'رجوع',
    'common.min': 'د',
    'empty.comingSoon': 'قريباً',
    'empty.comingSoonDesc': 'هذه الميزة قيد التطوير',
    'notifications.title': 'الإشعارات',
    'notifications.subtitle': 'تحكم في التذكيرات والإشعارات',
    'notifications.enabled': 'تفعيل الإشعارات',
    'notifications.enableNotifs': 'السماح بالإشعارات',
    'notifications.enableNotifsDesc': 'تفعيل جميع تذكيرات المهام',
    'notifications.taskReminders': 'تذكيرات المهام',
    'notifications.taskRemindersDesc': 'تذكير قبل وقت المهمة',
    'notifications.defaultReminders': 'التذكيرات الافتراضية',
    'notifications.reminderAtTime': 'عند الموعد',
    'notifications.reminder5': '5 دقائق قبل',
    'notifications.reminder10': '10 دقائق قبل',
    'notifications.reminder15': '15 دقيقة قبل',
    'notifications.reminder30': '30 دقيقة قبل',
    'notifications.reminder60': 'ساعة قبل',
    'notifications.reminderCustom': 'مخصص',
    'notifications.morningSummary': 'ملخص الصباح',
    'notifications.morningSummaryDesc': 'إشعار صباحي بمهام اليوم',
    'notifications.morningTime': 'وقت ملخص الصباح',
    'notifications.eveningReview': 'مراجعة المساء',
    'notifications.eveningReviewDesc': 'خلصت إيه النهارده؟',
    'notifications.eveningTime': 'وقت مراجعة المساء',
    'notifications.overdueReminder': 'تذكير المهام المتأخرة',
    'notifications.overdueReminderDesc': 'تذكير يومي بالمهام المتأخرة',
    'notifications.overdueTime': 'وقت تذكير المتأخرات',
    'notifications.quietHours': 'ساعات عدم الإزعاج',
    'notifications.quietHoursDesc': 'كتم الإشعارات في أوقات محددة',
    'notifications.quietStart': 'بداية الكتم',
    'notifications.quietEnd': 'نهاية الكتم',
    'notifications.sound': 'الصوت',
    'notifications.soundDesc': 'تشغيل صوت الإشعارات',
    'notifications.vibration': 'الاهتزاز',
    'notifications.vibrationDesc': 'اهتزاز عند الإشعار',
    'notifications.habitReminders': 'تذكير العادات',
    'notifications.habitRemindersDesc': 'تذكير يومي بالعادات',
    'notifications.habitTime': 'وقت تذكير العادات',
    'notifications.smartNudge': 'تذكير ذكي للمهام',
    'notifications.smartNudgeDesc': 'تنبيه يومي للمهام المستحقة بدون وقت محدد',
    'notifications.smartNudgeTime': 'وقت التذكير الذكي',
    'notifications.permissionDenied': 'الإشعارات غير مفعّلة',
    'notifications.permissionDeniedDesc': 'امنح التطبيق إذن الإشعارات من الإعدادات',
    'notifications.grantPermission': 'منح الإذن',
    'notifications.testNotification': 'إرسال إشعار تجريبي',
    'notifications.testSent': 'تم إرسال إشعار تجريبي',
    'notifications.sectionGeneral': 'عام',
    'notifications.sectionSchedule': 'الجدولة',
    'notifications.sectionQuiet': 'ساعات الكتم',
    'notifications.sectionSound': 'الصوت والاهتزاز',
    'notifications.minutesBefore': 'دقائق قبل الموعد',
    'notifications.customMinutes': 'عدد الدقائق',
    'notifications.save': 'حفظ',
    'notifications.weeklyBackup': 'تذكير النسخة الاحتياطية',
    'notifications.weeklyBackupDesc': 'كل أحد، صدّر نسخة من بياناتك',
    'notifications.weeklyBackupTime': 'وقت تذكير النسخة الاحتياطية',
    'filters.saved': 'فلاتر محفوظة',
    'filters.save': 'احفظ الفلتر',
    'filters.namePlaceholder': 'اسم الفلتر',
    'filters.untitled': 'فلتر بدون اسم',
    'today.greeting.morning': 'صباح الخير',
    'today.greeting.afternoon': 'مساء الخير',
    'today.greeting.evening': 'مساء الخير',
    'today.greeting.night': 'ليلة سعيدة',
    'today.date.format': 'EEEE d MMMM',
    'today.tasksCount': 'المهام',
    'today.completedCount': 'مكتملة',
    'today.remainingCount': 'متبقية',
    'today.timeline': 'الجدول',
    'today.list': 'قائمة',
    'today.reorderHint': 'اسحب المقبض لتغيير ترتيب مهام اليوم',
    'today.mit': 'أهم 3 مهام',
    'today.mitDesc': 'ركّز على الأهم اليوم',
    'today.noMIT': 'لم تحدد أي مهمة كأهم مهمة',
    'today.markMIT': 'تحديد كأهم مهمة',
    'today.unmarkMIT': 'إلغاء التحديد',
    'today.habits': 'عادات اليوم',
    'today.habitsHint': 'اعمل علامة بسرعة بعد التنفيذ',
    'today.startFocus': 'ابدأ التركيز',
    'today.suggestion': 'أنسب مهمة الآن',
    'today.suggestionDesc': 'حسب الأولوية والموعد',
    'today.start': 'ابدأ',
    'today.dailyReview': 'مراجعة اليوم',
    'today.quickAdd': 'إضافة سريعة',
    'today.noTimeTasks': 'لا توجد مهام بأوقات',
    'today.allDay': 'طوال اليوم',
    'today.now': 'الآن',
    'today.upcoming': 'قادمة',
    'today.past': 'سابقة',
    'review.title': 'مراجعة اليوم',
    'review.subtitle': 'خلصت إيه النهارده؟',
    'review.completed': 'مكتملة',
    'review.notCompleted': 'غير مكتملة',
    'review.postponed': 'مؤجلة',
    'review.moveTomorrow': 'رحّل لبكرة',
    'review.moveDate': 'رحّل لتاريخ',
    'review.suggestTime': 'اقترح وقت',
    'review.markDone': 'اكتملت',
    'review.cancelTask': 'إلغاء',
    'review.moveAllTomorrow': 'رحّل الكل لبكرة',
    'review.moveAllConfirm': 'تأكيد',
    'review.moveAllConfirmMsg': 'هل تريد رحّل جميع المهام غير المكتملة إلى الغد؟',
    'review.reflection': 'تأمل اليوم',
    'review.mood': 'مزاجك',
    'review.mood.great': 'ممتاز',
    'review.mood.good': 'جيد',
    'review.mood.okay': 'عادي',
    'review.mood.bad': 'سيء',
    'review.whatWentWell': 'ما الذي سار جيداً؟',
    'review.whatToImprove': 'ما الذي تريد تحسينه؟',
    'review.note': 'ملاحظات',
    'review.saveReflection': 'حفظ المراجعة',
    'review.reflectionSaved': 'تم حفظ المراجعة',
    'review.noTasksToday': 'لا توجد مهام لمراجعتها',
    'review.noTasksTodayDesc': 'أضف مهام لليوم لتتمكن من مراجعتها',
    'planner.title': 'الأسبوع',
    'planner.subtitle': 'خطط أسبوعك',
    'planner.week': 'أسبوع',
    'planner.month': 'شهر',
    'planner.today': 'اليوم',
    'planner.noTasks': 'لا توجد مهام في هذا اليوم',
    'planner.workload.light': 'خفيف',
    'planner.workload.balanced': 'متوازن',
    'planner.workload.overloaded': 'مزدحم',
    'planner.tasks': 'مهام',
    'planner.dragHint': 'اسحب مهمة لتغيير تاريخها',
    'rollover.rolled': 'تم ترحيلها',
    'rollover.times': 'مرات',
    'rollover.tooMany': 'هذه المهمة تم ترحيلها كثيراً',
    'rollover.tooManyMsg': 'تم ترحيل هذه المهمة 3 مرات أو أكثر. ماذا تريد أن تفعل؟',
    'rollover.split': 'تقسيم المهمة',
    'rollover.changePriority': 'تغيير الأولوية',
    'rollover.delete': 'حذف المهمة',
    'rollover.dismiss': 'تجاهل',
    'settings.autoRollover': 'الترحيل التلقائي',
    'settings.autoRolloverDesc': 'رحّل المهام غير المكتملة تلقائياً لليوم التالي',
    'settings.hijriDate': 'التاريخ الهجري',
    'settings.hijriDateDesc': 'عرض التاريخ الهجري بجانب الميلادي',
    'settings.simpleMode': 'تكبير نصوص النظام (شاومي)',
    'settings.simpleModeDesc': 'السماح بتكبير نصوص الهاتف. عند إيقافه (موصى به)، يحافظ التطبيق على حجمه الطبيعي المتناسق حتى في الوضع البسيط',
    'settings.fontScaleTitle': 'حجم الخط وملاءمة الشاشة',
    'settings.fontScaleSubtitle': 'التحكم في تناسق الواجهة وحجم النصوص',
    'settings.fontScaleNormal': 'حجم طبيعي متناسق (موصى به)',
    'settings.fontScaleSystem': 'تكبير نصوص النظام',
    'settings.fontScaleDetected': 'تم اكتشاف وضع شاومي البسيط',
    'settings.fontScaleDetectedDesc': 'النظام يفرض تكبيراً بنسبة {scale}x. تم تفعيل الحجم الطبيعي تلقائياً للحفاظ على توازن الشاشة.',
    'settings.fontScaleSize': 'مستوى تكبير التطبيق',
    'settings.fontScaleCompact': 'مدمج (90%)',
    'settings.fontScaleDefault': 'طبيعي (100%)',
    'settings.fontScaleComfortable': 'مريح (115%)',
  },
  en: {
    'appName': 'Waqty',
    'tab.today': 'Today',
    'tab.tasks': 'Tasks',
    'tab.plans': 'Plans',
    'tab.stats': 'Stats',
    'tab.settings': 'Settings',
    'today.title': 'Today',
    'today.subtitle': "Let's start a productive day",
    'today.noTasks': 'No tasks today',
    'today.noTasksDesc': 'Add a new task to start your day',
    'today.progress': "Today's Progress",
    'today.addTask': 'Add Task',
    'tasks.title': 'Tasks',
    'tasks.subtitle': 'All your tasks in one place',
    'calendar.title': 'Calendar',
    'calendar.subtitle': 'View tasks by date',
    'calendar.noTasks': 'No tasks on this day',
    'tasks.noTasks': 'No tasks yet',
    'tasks.noTasksDesc': 'Add a new task to organize your time',
    'tasks.addTask': 'Add Task',
    'tasks.search': 'Search tasks...',
    'tasks.filter': 'Filter',
    'tasks.sortBy': 'Sort by',
    'tasks.sort.date': 'Date',
    'tasks.sort.priority': 'Priority',
    'tasks.sort.title': 'Title',
    'tasks.sort.status': 'Status',
    'tasks.group.overdue': 'Overdue',
    'tasks.group.today': 'Today',
    'tasks.group.tomorrow': 'Tomorrow',
    'tasks.group.thisWeek': 'This Week',
    'tasks.group.later': 'Later',
    'tasks.quickAdd': 'Quick Add',
    'tasks.quickAddPlaceholder': "What's the task?",
    'tasks.quickAddTime': 'Time',
    'tasks.detail': 'Task Details',
    'tasks.edit': 'Edit Task',
    'tasks.new': 'New Task',
    'tasks.field.title': 'Title',
    'tasks.field.description': 'Description',
    'tasks.field.date': 'Date',
    'tasks.field.time': 'Start Time',
    'tasks.field.duration': 'Estimated Duration (min)',
    'tasks.field.deadline': 'Deadline',
    'tasks.field.priority': 'Priority',
    'tasks.field.category': 'Category',
    'tasks.field.tags': 'Tags',
    'tasks.field.subtasks': 'Subtasks',
    'tasks.field.repeat': 'Repeat',
    'tasks.field.notes': 'Notes',
    'tasks.field.customCategory': 'Custom Category',
    'tasks.priority.high': 'High',
    'tasks.priority.medium': 'Medium',
    'tasks.priority.low': 'Low',
    'tasks.status.pending': 'Pending',
    'tasks.status.in_progress': 'In Progress',
    'tasks.status.done': 'Done',
    'tasks.status.postponed': 'Postponed',
    'tasks.status.cancelled': 'Cancelled',
    'tasks.category.work': 'Work',
    'tasks.category.study': 'Study',
    'tasks.category.health': 'Health',
    'tasks.category.personal': 'Personal',
    'tasks.category.family': 'Family',
    'tasks.category.finance': 'Finance',
    'tasks.category.custom': 'Custom',
    'tasks.repeat.none': 'No Repeat',
    'tasks.repeat.daily': 'Daily',
    'tasks.repeat.weekly': 'Weekly',
    'tasks.repeat.monthly': 'Monthly',
    'tasks.repeat.custom': 'Custom Days',
    'tasks.repeat.days': 'Repeat Days',
    'tasks.subtasks.add': 'Add subtask',
    'tasks.subtasks.empty': 'No subtasks',
    'tasks.minutes': 'min',
    'tasks.hours': 'h',
    'tasks.estimatedTime': 'Estimated Time',
    'tasks.actualTime': 'Actual Time',
    'tasks.swipeComplete': 'Complete',
    'tasks.swipePostpone': 'Postpone',
    'tasks.swipeDelete': 'Delete',
    'tasks.confirmDelete': 'Confirm Delete',
    'tasks.confirmDeleteMsg': 'Are you sure you want to delete this task?',
    'tasks.deleted': 'Deleted',
    'tasks.selected': 'Selected',
    'tasks.bulkComplete': 'Complete selected',
    'tasks.dependsOn': 'Depends on tasks',
    'tasks.dependsOnHint': 'Finish these tasks before completing this one',
    'tasks.dependsOnEmpty': 'No other tasks available yet',
    'tasks.blockedTitle': 'Task is waiting',
    'tasks.blockedMsg': 'Finish these first:',
    'tasks.blockedCount': 'Tasks blocked by dependencies',
    'tasks.postponed': 'Postponed',
    'tasks.completed': 'Completed',
    'tasks.tags.placeholder': 'Add tag and press space',
    'pomodoro.title': 'Pomodoro Timer',
    'pomodoro.focus': 'Focus',
    'pomodoro.break': 'Break',
    'pomodoro.start': 'Start',
    'pomodoro.pause': 'Pause',
    'pomodoro.resume': 'Resume',
    'pomodoro.reset': 'Reset',
    'pomodoro.skip': 'Skip',
    'pomodoro.session': 'session',
    'pomodoro.sessions': 'sessions',
    'pomodoro.workDuration': 'Focus Duration (min)',
    'pomodoro.breakDuration': 'Break Duration (min)',
    'pomodoro.customize': 'Customize Timer',
    'pomodoro.completedSessions': 'Completed Sessions',
    'pomodoro.focusTime': 'Focus Time',
    'pomodoro.focusMinutes': 'focus minutes',
    'pomodoro.estimatedMinutes': 'estimated minutes',
    'pomodoro.longBreakDuration': 'Long break (after 4 sessions)',
    'pomodoro.longBreak': 'Long break',
    'pomodoro.autoStart': 'Auto-start next phase',
    'alarm.title': 'Task alarm',
    'alarm.subtitle': 'Loud tone + vibration at the exact due time',
    'alarm.tone': 'Alarm tone',
    'alarm.test': 'Preview',
    'alarm.bell': 'Bell',
    'alarm.digital': 'Digital',
    'alarm.siren': 'Siren',
    'alarm.chime': 'Chime',
    'alarm.pulse': 'Pulse',
    'alarm.bellDesc': 'Classic bell with medium vibration',
    'alarm.digitalDesc': 'Fast beeps with staccato vibration',
    'alarm.sirenDesc': 'Rising siren with strong vibration',
    'alarm.chimeDesc': 'Pleasant melody with stepped vibration',
    'alarm.pulseDesc': 'Strong pulses with deep vibration',
    'plans.title': 'Plans & Goals',
    'plans.subtitle': 'Plan for your success',
    'plans.noPlans': 'No plans yet',
    'plans.noPlansDesc': 'Create a plan or goal to get started',
    'plans.addPlan': 'Add Plan',
    'stats.title': 'Stats',
    'focus.title': 'Focus history',
    'focus.subtitle': 'All your focus and break sessions',
    'focusScreen.chooseTask': 'Link focus to a task (optional)',
    'focusScreen.free': 'Free focus',
    'focus.empty': 'No sessions yet',
    'focus.emptyDesc': 'Start a focus session from any task',
    'focus.total': 'Total focus',
    'focus.sessions': 'Sessions',
    'focus.focus': 'Focus',
    'focus.break': 'Break',
    'focus.viewHistory': 'Focus history',
    'templates.title': 'Task Templates',
    'templates.subtitle': 'Reusable recipes for recurring work',
    'templates.new': 'New template',
    'templates.edit': 'Edit template',
    'templates.empty': 'No templates yet',
    'templates.emptyDesc': 'Create a template for tasks you repeat often',
    'templates.use': 'Use',
    'templates.fromTask': 'From an existing task',
    'templates.field.title': 'Template name',
    'templates.field.description': 'Description',
    'templates.field.subtasks': 'Steps (one per line)',
    'templates.field.tags': 'Tags (comma separated)',
    'templates.created': 'Template saved',
    'templates.deleted': 'Template deleted',
    'routines.title': 'Ready-made routines',
    'routines.morning': 'Morning routine',
    'routines.evening': 'Evening routine',
    'routines.added': 'Routine tasks added to your day',
    'stats.subtitle': 'Track your progress and achievements',
    'stats.noData': 'No data yet',
    'stats.noDataDesc': 'Start by adding tasks and goals to see your stats',
    'stats.completedTasks': 'Completed Tasks',
    'stats.activeGoals': 'Active Goals',
    'stats.streak': 'Day Streak',
    'stats.momentum': 'Momentum & progress',
    'stats.currentStreak': 'Current',
    'stats.bestStreak': 'Best',
    'stats.level': 'Level',
    'stats.weeklyGoals': 'Weekly goals',
    'stats.tasksShort': 'tasks',
    'stats.minutesShort': 'minutes',
    'stats.focusMap': 'Focus map',
    'stats.focusMapHint': 'Each square is a day; darker means more sessions',
    'stats.habitMap': 'Habit map',
    'stats.habitMapHint': 'Each square is a day; darker means more habits done',
    'stats.estimateAccuracy': 'Time estimate accuracy',
    'stats.avgEstimate': 'Avg estimated',
    'stats.avgActual': 'Avg actual',
    'stats.suggestEstimate': 'Suggested for you',
    'stats.bestFocusTime': 'Best focus hours',
    'stats.badges': 'Achievement badges',
    'badge.first_step.title': 'First step',
    'badge.first_step.desc': 'Complete your first task',
    'badge.deep_focus.title': 'Deep focus',
    'badge.deep_focus.desc': '120 focus minutes',
    'badge.week_streak.title': 'Seven-day streak',
    'badge.week_streak.desc': '7 days in a row',
    'badge.habit_keeper.title': 'Habit keeper',
    'badge.habit_keeper.desc': '10 habit check-ins',
    'badge.reflector.title': 'Regular reflector',
    'badge.reflector.desc': '3 daily reviews',
    'stats.weeklyProgress': 'Weekly Progress',
    'plans.goalsTab': 'Goals',
    'plans.plansTab': 'Plans',
    'plans.habitsTab': 'Habits',
    'plans.newGoal': 'New Goal',
    'plans.newPlan': 'New Plan',
    'plans.newHabit': 'New Habit',
    'plans.goalTitle': 'Goal title',
    'plans.goalDescription': 'Description',
    'plans.goalMotivation': 'Why do you want this?',
    'plans.targetValue': 'Target value',
    'plans.targetUnit': 'Unit (e.g. books)',
    'plans.targetDate': 'Target date',
    'plans.category': 'Category',
    'plans.type': 'Goal type',
    'plans.status': 'Status',
    'plans.color': 'Color',
    'plans.shortTerm': 'Short term',
    'plans.midTerm': 'Medium term',
    'plans.longTerm': 'Long term',
    'plans.active': 'Active',
    'plans.completed': 'Completed',
    'plans.paused': 'Paused',
    'plans.fromTemplate': 'Start from a template',
    'plans.blankGoal': 'Blank goal',
    'plans.startFromTemplate': 'Create from template',
    'plans.templatePreview': 'Milestones and suggested tasks will be created automatically',
    'plans.milestones': 'Milestones',
    'plans.linkedTasks': 'Linked tasks',
    'plans.updateProgress': 'Update progress',
    'plans.currentValue': 'Current value',
    'plans.autoProgress': 'Automatic from tasks',
    'plans.manualProgress': 'Manual update',
    'plans.noGoals': 'No goals yet',
    'plans.noGoalsDesc': 'Create a goal or pick a ready-made template',
    'plans.noHabits': 'No habits yet',
    'plans.noHabitsDesc': 'Add a daily or weekly habit to build your streak',
    'plans.noPlansList': 'No plans yet',
    'plans.noPlansListDesc': 'Link a plan to a goal to split the work into phases',
    'plans.habitTitle': 'Habit name',
    'plans.habitDescription': 'Description',
    'plans.frequency': 'Frequency',
    'plans.daily': 'Daily',
    'plans.weekly': 'Weekly',
    'plans.custom': 'Custom',
    'plans.customDays': 'Selected days',
    'plans.reminderTime': 'Reminder time',
    'plans.streak': 'Streak',
    'plans.bestStreak': 'Best streak',
    'plans.today': 'Today',
    'plans.doneToday': 'Done today',
    'plans.editGoal': 'Edit goal',
    'plans.editPlan': 'Edit plan',
    'plans.editHabit': 'Edit habit',
    'plans.deleteGoal': 'Delete goal',
    'plans.deletePlan': 'Delete plan',
    'plans.deleteHabit': 'Delete habit',
    'plans.planTitle': 'Plan title',
    'plans.startDate': 'Start date',
    'plans.endDate': 'End date',
    'plans.phases': 'Phases',
    'plans.tasks': 'Tasks',
    'plans.goal': 'Goal',
    'plans.selectGoal': 'Select a goal',
    'plans.noGoal': 'No goal',
    'plans.addMilestone': 'Add milestone',
    'plans.milestoneTitle': 'Milestone title',
    'plans.tasksCreated': 'Suggested tasks',
    'plans.createTasks': 'Create suggested tasks',
    'plans.weeklyPlan': 'Weekly plan',
    'plans.monthlyPlan': 'Monthly plan',
    'plans.customPlan': 'Custom plan',
    'stats.overview': 'Overview',
    'stats.completed': 'Completed',
    'stats.pending': 'Pending',
    'stats.inProgress': 'In progress',
    'stats.completionRate': 'Completion rate',
    'stats.totalTasks': 'Total tasks',
    'stats.focusTime': 'Focus time',
    'stats.sessions': 'Focus sessions',
    'stats.goalsCompleted': 'Goals completed',
    'stats.avgGoalProgress': 'Average goal progress',
    'stats.habitConsistency': 'Habit consistency',
    'stats.weeklyActivity': 'Weekly activity',
    'stats.completionTrend': 'Completion trend',
    'stats.bestDay': 'Best day',
    'stats.categoryBreakdown': 'Task categories',
    'stats.moodTrend': 'Mood over period',
    'stats.recentActivity': 'Recent wins',
    'stats.last7': 'Last 7 days',
    'stats.last30': 'Last 30 days',
    'stats.allTime': 'All time',
    'stats.done': 'Done',
    'stats.created': 'Created',
    'stats.noActivity': 'No activity in this period',
    'stats.noReviews': 'No daily reviews yet',
    'tasks.noNotes': 'No notes yet',
    'tasks.addDetails': 'More details',
    'tasks.mit': "Today's top priority",
    'tasks.mitLabel': 'Most important task',
    'tasks.quickTime': 'Quick time',
    'tasks.time.now': 'Now',
    'tasks.time.later': 'In 1 hour',
    'tasks.time.tomorrow': 'Tomorrow 9am',
    'tasks.time.morning': '9am',
    'tasks.time.evening': '7pm',
    'tasks.time.clear': 'No time',
    'tasks.reminder': 'Reminders for this task',
    'tasks.reminder.none': 'No reminder',
    'tasks.reminder.default': 'Default',
    'tasks.viewList': 'List',
    'tasks.viewMatrix': 'Matrix',
    'tasks.scheduleConflict': 'Time clash',
    'tasks.blocks': 'Tasks waiting on this one',
    'tasks.blocksHint': 'These cannot be completed before this task',
    'tasks.conflictBanner': 'Some task times overlap',
    'tasks.fixConflicts': 'Tap to shuffle them into free slots',
    'tasks.conflictsFixed': 'Schedule tidied up',
    'tasks.fixedCount': 'Tasks adjusted',
    'tasks.impact': 'Most impactful',
    'tasks.impactHint': 'Finishing these unblocks other tasks',
    'tasks.quickWins': 'Quick wins',
    'tasks.quickWinsHint': 'Small tasks that are urgent or important',
    'matrix.do': 'Do now',
    'matrix.doHint': 'Urgent and important',
    'matrix.schedule': 'Schedule',
    'matrix.scheduleHint': 'Important, not urgent',
    'matrix.delegate': 'Delegate',
    'matrix.delegateHint': 'Urgent, less important',
    'matrix.eliminate': 'Drop',
    'matrix.eliminateHint': 'Not urgent or important',
    'matrix.empty': 'Nothing to prioritize',
    'search.title': 'Global Search',
    'search.subtitle': 'Search across all your data',
    'search.placeholder': 'Search tasks, goals, plans, habits...',
    'search.noResults': 'No matching results',
    'search.tasks': 'Tasks',
    'search.goals': 'Goals',
    'search.plans': 'Plans',
    'search.habits': 'Habits',
    'search.reviews': 'Reviews',
    'data.title': 'Backup & Data',
    'data.subtitle': 'Export or restore your data',
    'data.export': 'Export data',
    'data.exportDesc': 'Download a JSON backup of all your data',
    'data.download': 'Download file',
    'data.import': 'Import data',
    'data.importDesc': 'Paste backup file contents to restore your data',
    'data.importHint': 'Paste the JSON backup contents here',
    'data.apply': 'Import',
    'data.success': 'Operation completed successfully',
    'data.error': 'Operation failed, check the data format',
    'data.clear': 'Clear all data',
    'data.clearDesc': 'Permanently delete all tasks, goals, plans and habits',
    'data.copied': 'Copied',
    'data.health': 'Data health check',
    'data.healthDesc': 'Find broken links and clashes before you export a backup',
    'data.healthRun': 'Run check',
    'data.healthScore': 'Data health score',
    'data.healthRecords': 'records',
    'data.healthClean': 'Your data looks clean — no issues found',
    'data.healthRepair': 'Safe auto-repair',
    'data.healthRepaired': 'Broken links repaired',
    'data.health.brokenDeps': 'Missing dependency links',
    'data.health.cycles': 'Dependency cycles',
    'data.health.duplicates': 'Duplicate ids',
    'data.health.invalidDates': 'Invalid dates',
    'data.health.deadlineBeforeDate': 'Deadline before task date',
    'data.health.orphanReminders': 'Reminders for deleted tasks',
    'data.health.orphanPomodoros': 'Focus sessions for deleted tasks',
    'data.health.habitConfig': 'Habits with incomplete setup',
    'data.health.planLinks': 'Plan links to deleted tasks',
    'data.health.conflicts': 'Schedule conflicts',
    'data.health.overdue': 'Overdue tasks',
    'planning.auto': 'Auto-schedule',
    'planning.autoDesc': 'Distribute unscheduled tasks across available days by priority',
    'planning.scheduled': 'Tasks scheduled',
    'planning.noCandidates': 'No tasks need scheduling',
    'weekly.title': 'Weekly Review',
    'weekly.subtitle': 'Reflect on your week and plan ahead',
    'weekly.weekOf': 'Week of',
    'weekly.completed': 'Tasks completed',
    'weekly.rate': 'Completion rate',
    'weekly.goals': 'Goal progress',
    'weekly.habits': 'Habit consistency',
    'weekly.moods': 'Mood',
    'weekly.reflection': 'Your reflection',
    'weekly.well': 'What went well?',
    'weekly.improve': 'What could improve?',
    'weekly.note': 'Notes',
    'weekly.save': 'Save review',
    'weekly.saved': 'Review saved',
    'weekly.noData': 'Not enough data for this week',
    'weekly.highlights': 'Highlights',
    'weekly.previous': 'Previous reviews',
    'weekly.prompt.well1': 'My biggest win this week was...',
    'weekly.prompt.well2': 'Something I am proud of...',
    'weekly.prompt.improve1': 'The obstacle that kept repeating was...',
    'weekly.prompt.improve2': 'Next week I will change...',
    'weekly.prompt.note1': 'Top priority next week...',
    'weekly.summary': 'Ready-made summary',
    'weekly.summaryHint': 'A short recap from this week’s numbers, ready to share or save',
    'weekly.generate': 'Generate summary',
    'weekly.copySummary': 'Copy / share summary',
    'weekly.summaryCopied': 'Summary copied',
    'weekly.summaryInNote': 'Summary added to notes',
    'settings.system': 'System',
    'settings.dataExport': 'Data & Backup',
    'settings.dataExportDesc': 'Export and import app data',
    'settings.weeklyGoals': 'Weekly goals',
    'settings.tabOrder': 'Tab order',
    'settings.tabOrderDesc': 'Use the arrows to move tabs',
    'settings.weeklyTasksGoal': 'Tasks per week',
    'settings.weeklyFocusGoal': 'Focus minutes per week',
    'settings.search': 'Global Search',
    'settings.searchDesc': 'Search all tasks, goals and plans',
    'settings.weeklyReview': 'Weekly Review',
    'settings.weeklyReviewDesc': 'Reflect on your week and record insights',
    'notfound.title': 'Page not found',
    'notfound.msg': "Looks like you've reached a page that doesn't exist",
    'notfound.back': 'Back to home',
    'settings.title': 'Settings',
    'settings.subtitle': 'Customize your experience',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.lightMode': 'Light Mode',
    'settings.darkMode': 'Dark Mode',
    'settings.colors': 'App Colors',
    'settings.colorsDesc': 'Choose a palette that suits your style — applied instantly',
    'settings.about': 'About',
    'settings.aboutDesc': 'Waqty - Time Management App',
    'settings.version': 'Version',
    'update.check': 'Check for updates',
    'update.checkDesc': 'Find a newer version and download it from inside the app',
    'update.checking': 'Checking for updates...',
    'update.available': 'A new update is available',
    'update.current': 'Current version',
    'update.latest': 'Latest',
    'update.notes': "What's new",
    'update.download': 'Download update',
    'update.later': 'Later',
    'update.ok': 'OK',
    'update.noUpdate': 'You are already on the latest version',
    'update.error': 'Could not check for updates. Check your connection and try again.',
    'update.downloading': 'Downloading update...',
    'update.installing': 'Opening installer...',
    'update.downloadFailed': 'Could not download the update. Check your connection and try again.',
    'update.retry': 'Retry',
    'update.openBrowser': 'Open in browser instead',
    'update.installHint': 'If Android asks to allow installing unknown apps, enable it and return to finish the install.',
    'common.add': 'Add',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.cancel': 'Cancel',
    'common.undo': 'Undo',
    'common.save': 'Save',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.all': 'All',
    'common.none': 'None',
    'common.back': 'Back',
    'common.min': 'm',
    'empty.comingSoon': 'Coming Soon',
    'empty.comingSoonDesc': 'This feature is under development',
    'notifications.title': 'Notifications',
    'notifications.subtitle': 'Control reminders and notifications',
    'notifications.enabled': 'Enable Notifications',
    'notifications.enableNotifs': 'Allow Notifications',
    'notifications.enableNotifsDesc': 'Enable all task reminders',
    'notifications.taskReminders': 'Task Reminders',
    'notifications.taskRemindersDesc': 'Remind before task time',
    'notifications.defaultReminders': 'Default Reminders',
    'notifications.reminderAtTime': 'At time',
    'notifications.reminder5': '5 min before',
    'notifications.reminder10': '10 min before',
    'notifications.reminder15': '15 min before',
    'notifications.reminder30': '30 min before',
    'notifications.reminder60': '1 hour before',
    'notifications.reminderCustom': 'Custom',
    'notifications.morningSummary': 'Morning Summary',
    'notifications.morningSummaryDesc': 'Daily morning summary of tasks',
    'notifications.morningTime': 'Morning Summary Time',
    'notifications.eveningReview': 'Evening Review',
    'notifications.eveningReviewDesc': 'What did you finish today?',
    'notifications.eveningTime': 'Evening Review Time',
    'notifications.overdueReminder': 'Overdue Reminder',
    'notifications.overdueReminderDesc': 'Daily reminder for overdue tasks',
    'notifications.overdueTime': 'Overdue Reminder Time',
    'notifications.quietHours': 'Do Not Disturb',
    'notifications.quietHoursDesc': 'Mute notifications during set hours',
    'notifications.quietStart': 'Quiet Start',
    'notifications.quietEnd': 'Quiet End',
    'notifications.sound': 'Sound',
    'notifications.soundDesc': 'Play notification sound',
    'notifications.vibration': 'Vibration',
    'notifications.vibrationDesc': 'Vibrate on notification',
    'notifications.habitReminders': 'Habit Reminders',
    'notifications.habitRemindersDesc': 'Daily reminder for habits',
    'notifications.habitTime': 'Habit Reminder Time',
    'notifications.smartNudge': 'Smart task nudge',
    'notifications.smartNudgeDesc': 'Daily alert for undated tasks due today',
    'notifications.smartNudgeTime': 'Smart nudge time',
    'notifications.permissionDenied': 'Notifications not enabled',
    'notifications.permissionDeniedDesc': 'Grant notification permission in settings',
    'notifications.grantPermission': 'Grant Permission',
    'notifications.testNotification': 'Send Test Notification',
    'notifications.testSent': 'Test notification sent',
    'notifications.sectionGeneral': 'General',
    'notifications.sectionSchedule': 'Schedule',
    'notifications.sectionQuiet': 'Quiet Hours',
    'notifications.sectionSound': 'Sound & Vibration',
    'notifications.minutesBefore': 'minutes before',
    'notifications.customMinutes': 'Custom minutes',
    'notifications.save': 'Save',
    'notifications.weeklyBackup': 'Backup reminder',
    'notifications.weeklyBackupDesc': 'Every Sunday, export a copy of your data',
    'notifications.weeklyBackupTime': 'Backup reminder time',
    'filters.saved': 'Saved filters',
    'filters.save': 'Save filter',
    'filters.namePlaceholder': 'Filter name',
    'filters.untitled': 'Untitled filter',
    'today.greeting.morning': 'Good morning',
    'today.greeting.afternoon': 'Good afternoon',
    'today.greeting.evening': 'Good evening',
    'today.greeting.night': 'Good night',
    'today.date.format': 'EEEE, MMM d',
    'today.tasksCount': 'Tasks',
    'today.completedCount': 'Done',
    'today.remainingCount': 'Left',
    'today.timeline': 'Timeline',
    'today.list': 'List',
    'today.reorderHint': 'Drag the handle to reorder today’s tasks',
    'today.mit': 'Top 3 Tasks',
    'today.mitDesc': 'Focus on what matters most',
    'today.noMIT': 'No top tasks marked yet',
    'today.markMIT': 'Mark as top task',
    'today.unmarkMIT': 'Unmark',
    'today.habits': "Today's habits",
    'today.habitsHint': 'Quick check-in after you do them',
    'today.startFocus': 'Start Focus',
    'today.suggestion': 'Best task right now',
    'today.suggestionDesc': 'Based on priority and due date',
    'today.start': 'Start',
    'today.dailyReview': 'Daily Review',
    'today.quickAdd': 'Quick Add',
    'today.noTimeTasks': 'No timed tasks',
    'today.allDay': 'All day',
    'today.now': 'Now',
    'today.upcoming': 'Upcoming',
    'today.past': 'Past',
    'review.title': 'Daily Review',
    'review.subtitle': 'What did you finish today?',
    'review.completed': 'Completed',
    'review.notCompleted': 'Not Completed',
    'review.postponed': 'Postponed',
    'review.moveTomorrow': 'Move to tomorrow',
    'review.moveDate': 'Move to date',
    'review.suggestTime': 'Suggest time',
    'review.markDone': 'Mark done',
    'review.cancelTask': 'Cancel',
    'review.moveAllTomorrow': 'Move all unfinished to tomorrow',
    'review.moveAllConfirm': 'Confirm',
    'review.moveAllConfirmMsg': 'Move all unfinished tasks to tomorrow?',
    'review.reflection': 'Daily Reflection',
    'review.mood': 'How was your day?',
    'review.mood.great': 'Great',
    'review.mood.good': 'Good',
    'review.mood.okay': 'Okay',
    'review.mood.bad': 'Bad',
    'review.whatWentWell': 'What went well?',
    'review.whatToImprove': 'What to improve?',
    'review.note': 'Notes',
    'review.saveReflection': 'Save Review',
    'review.reflectionSaved': 'Review saved',
    'review.noTasksToday': 'No tasks to review',
    'review.noTasksTodayDesc': 'Add tasks for today to review them',
    'planner.title': 'Week',
    'planner.subtitle': 'Plan your week',
    'planner.week': 'Week',
    'planner.month': 'Month',
    'planner.today': 'Today',
    'planner.noTasks': 'No tasks on this day',
    'planner.workload.light': 'Light',
    'planner.workload.balanced': 'Balanced',
    'planner.workload.overloaded': 'Overloaded',
    'planner.tasks': 'tasks',
    'planner.dragHint': 'Drag a task to reschedule',
    'rollover.rolled': 'Rolled over',
    'rollover.times': 'times',
    'rollover.tooMany': 'This task has been rolled over too many times',
    'rollover.tooManyMsg': 'This task has been rolled over 3+ times. What would you like to do?',
    'rollover.split': 'Split task',
    'rollover.changePriority': 'Change priority',
    'rollover.delete': 'Delete task',
    'rollover.dismiss': 'Dismiss',
    'settings.autoRollover': 'Auto Rollover',
    'settings.autoRolloverDesc': 'Automatically move unfinished tasks to the next day',
    'settings.hijriDate': 'Hijri Date',
    'settings.hijriDateDesc': 'Show Hijri date alongside Gregorian',
    'settings.simpleMode': 'System Text Scaling (Xiaomi)',
    'settings.simpleModeDesc': 'Allow phone system text scaling. Turn off (recommended) to keep the app at its natural balanced proportions',
    'settings.fontScaleTitle': 'Font & Display Scale',
    'settings.fontScaleSubtitle': 'Control layout balance and font proportions',
    'settings.fontScaleNormal': 'Natural Balanced Size (Recommended)',
    'settings.fontScaleSystem': 'System Text Scaling',
    'settings.fontScaleDetected': 'Xiaomi Lite Mode Detected',
    'settings.fontScaleDetectedDesc': 'The system forces a {scale}x font scale. Natural size is locked to preserve layout consistency.',
    'settings.fontScaleSize': 'App Display Size',
    'settings.fontScaleCompact': 'Compact (90%)',
    'settings.fontScaleDefault': 'Normal (100%)',
    'settings.fontScaleComfortable': 'Comfortable (115%)',
  },
};

export function isRTL(lang: Language): boolean {
  return lang === 'ar';
}
