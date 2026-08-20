// The built-in knowledge base. Every answer here is authored into the app:
// nothing searches the internet, and a question this file cannot answer says
// so instead of guessing. That gate is the feature.

export interface KnowledgeEntry {
  id: string
  q: string
  a: string
  group: string
  aliases: string[]
}

// The handful worth putting in front of somebody who has not asked anything
// yet. Four, because a list of forty five suggestions is not a suggestion, it
// is the same wall of text the search box was meant to save you from.
export const COMMON_IDS = ['basic-start-weight', 'strong-progression', 'basic-sets-reps', 'basic-soreness']

export const KNOWLEDGE_GROUPS = [
  'The basics',
  'Getting stronger',
  'Using the app',
  'Your numbers',
  'Words you will see',
] as const

// --- Using the app -----------------------------------------------------------

const APP: KnowledgeEntry[] = [
  {
    id: 'app-superset-how',
    q: 'How do I make a superset in the app?',
    group: 'Using the app',
    aliases: ['create superset', 'link exercises', 'pair exercises', 'multiple supersets'],
    a: 'Three ways. In the exercise picker, switch the Superset toggle on and everything you pick joins one group until you switch it off. In a session, tap Link between any two blocks to join them. In the workout builder, the same toggle exists, and saved workouts keep their groups. A workout can hold as many supersets as you like: they letter themselves A, B, C and onward, and each group rests as one, with the clock starting after its last movement.',
  },
  {
    id: 'app-dropset-how',
    q: 'How do I log a drop set?',
    group: 'Using the app',
    aliases: ['log drop set', 'record drop set', 'strip set entry', 'drop button'],
    a: 'Add a set and put the lighter weight in it. That is the whole thing: a drop set is running less weight straight after your working set, and it does not need its own button or a label. There used to be one and it was ceremony around something you can already do. Sessions logged when that button existed still carry their drop rows, and the importer still reads a notes line like 130x12 110x15 as a set and its drop.',
  },
  {
    id: 'app-ghost',
    q: 'What is the grey line above my sets?',
    group: 'Using the app',
    aliases: ['ghost line', 'last session line', 'previous workout numbers'],
    a: 'Your last session of that movement: the date and every set of it. It is the number to beat today. The weight from it also prefills when you add a set, so most sets are two taps.',
  },
  {
    id: 'app-coach',
    q: 'What is the orange advice line under a set?',
    group: 'Using the app',
    aliases: ['coach line', 'over target', 'under target', 'try suggestion'],
    a: 'The coach line, running double progression. It reads the reps you actually did against the range for your goal and suggests one concrete change: one more rep at the same load, or when you clear the top of the range, about 5 percent more weight and back to the bottom of it. Under the range it takes about 7.5 percent off.',
  },
  {
    id: 'app-rest-timer',
    q: 'How does the rest timer work?',
    group: 'Using the app',
    aliases: ['timer', 'rest countdown', 'rest between sets'],
    a: 'It starts itself the moment a set is complete, sized to the movement and your goal: longer for big lifts, shorter for arms and calves, none for cardio. In a superset it waits for the last movement of the group. It counts to a fixed end time, so locking your phone gives back the right number, and every exercise has a manual Rest button when the guess is wrong.',
  },
  {
    id: 'app-rpe-hidden',
    q: 'Why is there no RPE box on a set?',
    group: 'Using the app',
    aliases: ['no rpe field', 'rpe missing', 'effort scale hidden', 'where did rpe go', 'rate of perceived exertion'],
    a: 'Because it was a number guessed between sets while out of breath, and ten guesses do not average into a fact. Instead the app asks one question when you end a session: how was that, 1 to 10. That single honest answer is what the training block reads. Progress on the sets themselves is simpler than RPE ever was: add a rep until you clear the top of the range, then add weight and start again at the bottom.',
  },
  {
    id: 'app-offline',
    q: 'What happens if I lose signal mid workout?',
    group: 'Using the app',
    aliases: ['no wifi', 'offline', 'gym has no signal', 'lost connection'],
    a: 'Nothing you typed is lost. Sets are held on your phone, retried automatically, and written the moment the connection returns, even if the tab died in between. The one thing that needs a connection is opening the app fresh.',
  },
  {
    id: 'app-swap',
    q: 'Why did the app swap an exercise in my plan?',
    group: 'Using the app',
    aliases: ['different exercise', 'substitution', 'sore joint swap', 'knee swap'],
    a: 'You flagged a joint, so sessions swap the movement and keep the pattern: a sore knee gets leg press instead of squats, not a day without legs. Flags live on your profile, under Your body, and every swap is undoable by picking the original from the library.',
  },
  {
    id: 'app-order',
    q: 'Why are my exercises in this order?',
    group: 'Using the app',
    aliases: ['exercise order', 'hardest first', 'reorder', 'move exercise'],
    a: 'Sessions generated from your plan come out hardest first: big multi joint lifts before small ones, judged partly on your own logged weights, because the hardest thing should meet you fresh. Days you picked by name or built yourself keep exactly the order they were written in. The arrows on each block move anything, and a superset moves as one.',
  },
  {
    id: 'app-import',
    q: 'How do I bring in my old training history?',
    group: 'Using the app',
    aliases: ['import', 'old data', 'artifact', 'migrate history'],
    a: 'Settings, then paste your exported history into the import box. Both old formats are understood, including text sets like 135x8 @8. Everything can also leave again as CSV, one row per set, from the same screen.',
  },
  {
    id: 'app-move-day',
    q: 'How do I move a workout to a different day?',
    group: 'Using the app',
    aliases: [
      'swap my workout days', 'change the day', 'move a session', 'reschedule workout',
      'shift a day', 'swap monday tuesday wednesday', 'swap thursday friday saturday sunday',
      'train on a different day', 'plans changed',
    ],
    a: 'On the Calendar tab, every session in the What is coming list has a Move button. Tap it, pick the day you want, and the two days trade what they hold: whatever was on the day you picked comes back to the day you moved from. Rest days are on the list too, so you can move a session onto an empty day. It only changes those two dates, so moving one Tuesday does not move every Tuesday after it.',
  },
  {
    id: 'app-schedule',
    q: 'How do I change which days I train?',
    group: 'Using the app',
    aliases: ['set my week', 'training days', 'lay out my week', 'change my split days'],
    a: 'Profile, then the week section, where you say which session belongs to which weekday. That is the pattern the app repeats, so it is the thing to edit when your normal week has genuinely changed. If it is only this week that is different, move the individual day from the Calendar tab instead and leave the pattern alone.',
  },
  {
    id: 'app-notifications',
    q: 'How do I turn notifications on or off?',
    group: 'Using the app',
    aliases: ['push notifications', 'reminders', 'rest timer alert', 'weekly check in', 'stop notifications'],
    a: 'Settings has two switches and they are separate. Alert me when rest is up buzzes you when a rest timer finishes. Check in on my week sends one message a week at a day and time you choose. Turning either off is immediate. On an iPhone, notifications only work if LiftyBot is on your home screen, and your phone only asks permission once, so if you said no to it earlier you have to change it in your phone settings rather than in the app.',
  },
  {
    id: 'app-install',
    q: 'How do I put LiftyBot on my home screen?',
    group: 'Using the app',
    aliases: ['install the app', 'add to home screen', 'app store', 'download liftybot'],
    a: 'There is no app store download, and there does not need to be. In Safari on an iPhone, tap the share button and then Add to Home Screen. In Chrome on Android, use Install app from the menu. It then opens like any other app, works without signal, and on an iPhone it is the only way notifications can reach you.',
  },
  {
    id: 'app-new-phone',
    q: 'What happens to my training if I get a new phone?',
    group: 'Using the app',
    aliases: ['new phone', 'does my data sync', 'lost my phone', 'second device', 'log in elsewhere'],
    a: 'Nothing happens to it. Your sessions live on the server against your account, not on the handset, so signing in on a new phone brings everything with it: every workout, your bodyweight history, your profile and your schedule. The copy held on the phone is a mirror for training without signal, not the only copy.',
  },
  {
    id: 'app-export',
    q: 'Can I get my data out?',
    group: 'Using the app',
    aliases: ['export csv', 'download my data', 'spreadsheet', 'back up my log'],
    a: 'Settings, then Export CSV. You get one row per set, which opens in any spreadsheet and is the format to keep if you ever want your history somewhere else. It is your log; nothing about it is locked in here.',
  },
  {
    id: 'app-delete',
    q: 'How do I delete my account?',
    group: 'Using the app',
    aliases: ['delete my data', 'close my account', 'remove my account', 'wipe everything'],
    a: 'Settings, at the bottom, Delete my account. It removes every session, every set, your bodyweight history and your profile, and it is not reversible. Export a CSV first if there is any chance you want the record. Signing out, just above it, leaves everything where it is.',
  },
  {
    id: 'app-cost',
    q: 'Does LiftyBot cost anything?',
    group: 'Using the app',
    aliases: ['is it free', 'subscription', 'do i have to pay', 'ads', 'premium tier'],
    a: 'No. There is no charge, no adverts, and nothing in here is working its way toward asking you for a card. It exists because one person wanted it to exist. Your log stays yours either way: Settings exports every set as a spreadsheet and deletes your account outright, so nothing about staying is a lock in.',
  },
  {
    id: 'app-nutrition',
    q: 'Does the app track food or protein?',
    group: 'Using the app',
    aliases: ['nutrition', 'protein', 'diet', 'calories', 'macros'],
    a: 'No, and it will not pretend to. This is a training log: it holds and shows the lifting. Eating for your goal matters at least as much, and it deserves a tool that takes it seriously rather than a widget here.',
  },
  {
    id: 'app-how-plan-built',
    q: 'How does the app decide my plan?',
    group: 'Using the app',
    aliases: ['how is my plan made', 'why these exercises', 'how the plan works', 'program chosen'],
    a: 'From your answers, in this order: how long you have been training picks the program, how many days you train picks the split, your equipment removes anything you cannot do, a flagged joint removes anything that would aggravate it, and the muscle you asked to bring up gets moved earlier. What is left is the session, trimmed to the time you said you had.',
  },
  {
    id: 'app-swap-exercise',
    q: 'How do I swap an exercise I do not like?',
    group: 'Using the app',
    aliases: ['swap exercise', 'change an exercise', 'replace movement', 'dont like this exercise'],
    a: 'Tap the exercise inside a session and choose the swap. You get movements that train the same thing with the equipment you have, so the shape of the session survives. If you swap the same one out every week, it is worth saying the equipment is unavailable on your profile so it stops being offered at all.',
  },
  {
    id: 'app-add-exercise',
    q: 'Can I add an exercise to a session?',
    group: 'Using the app',
    aliases: ['add exercise', 'extra movement', 'add to workout', 'more work'],
    a: 'Yes, from inside the session. Anything in the library, and anything you type in yourself if the library does not have it. Added movements count toward your volume the same as programmed ones, and a movement you add by hand often turns out to be something the library should have had, which is a report we read.',
  },
  {
    id: 'app-edit-past',
    q: 'Can I fix a workout I logged wrong?',
    group: 'Using the app',
    aliases: ['edit past workout', 'fix a set', 'wrong weight logged', 'change history'],
    a: 'Yes. Open it from the log and edit any set, or delete the session outright. Nothing is locked after the fact, because a log you cannot correct becomes a log you stop trusting, and then a log you stop keeping.',
  },
  {
    id: 'app-custom-exercise',
    q: 'What if the exercise I do is not in the app?',
    group: 'Using the app',
    aliases: ['custom exercise', 'not in the list', 'add my own', 'missing exercise'],
    a: 'Type it in and it becomes yours, with a type and a muscle group you set. It works everywhere a library movement does. It is also a signal: when several people invent the same movement, that is the library being told what it lacks, and it gets added properly.',
  },
  {
    id: 'app-share',
    q: 'Can I share a workout with someone?',
    group: 'Using the app',
    aliases: ['share a workout', 'send to a friend', 'share link', 'show someone'],
    a: 'Yes, a session can be shared as a link that shows what you did. It shows the training and nothing else about you, and it stops working when you turn it off.',
  },
  {
    id: 'app-block-week',
    q: 'What is the block number on my calendar?',
    group: 'Using the app',
    aliases: ['block number', 'week of the block', 'what block am i in', 'training block app'],
    a: 'Which week of the current block you are in. A block is four to six weeks of the same plan with the load creeping up, ending in an easier week. It is there so an easy week reads as part of the plan rather than as a week you fell off.',
  },
  {
    id: 'app-bodyweight',
    q: 'How do I track my bodyweight?',
    group: 'Using the app',
    aliases: ['log bodyweight', 'track weight', 'weigh in', 'scale'],
    a: 'Log it from your profile whenever you weigh yourself, and the Progress tab charts it. Daily readings bounce around by several pounds for reasons that have nothing to do with fat, so read the line across weeks rather than comparing today with yesterday.',
  },
]

// --- Your numbers ------------------------------------------------------------

const NUMBERS: KnowledgeEntry[] = [
  {
    id: 'num-pr',
    q: 'What counts as a PR here?',
    group: 'Your numbers',
    aliases: ['personal record', 'pr flag', 'best set'],
    a: 'Four things, each flagged on the set as you type it: your heaviest load, the most reps at your best load or above, your best estimated max, and your best single session volume on that movement. A first outing is never a record, and a heavy single only counts when your goal is strength, because a log that rewards grinding teaches ego lifting.',
  },
  {
    id: 'num-e1rm',
    q: 'What is estimated max?',
    group: 'Your numbers',
    aliases: ['e1rm', 'estimated 1rm', 'one rep max', 'projected max'],
    a: 'What your set suggests you could lift once, from the Epley formula: weight times one plus reps over thirty. It is why 80 x 9 counts as progress over 80 x 8 without touching the plates, and it is the line the progress charts draw for weighted movements. It is an estimate, not an invitation to test it.',
  },
  {
    id: 'num-volume',
    q: 'What does the lb number on a session mean?',
    group: 'Your numbers',
    aliases: ['session volume', 'total lifted', 'tonnage'],
    a: 'Weight times reps, summed over every weighted set: the session’s tonnage. Useful against the same session last time, and meaningless between a leg day and an arm day, which is why the app never compares those.',
  },
  {
    id: 'num-coverage',
    q: 'What is the sets per muscle bar for?',
    group: 'Your numbers',
    aliases: ['weekly coverage', '10 sets', 'muscle group target'],
    a: 'Hard sets per muscle group this week against a target of 10, which is where the growth evidence points for most people. It is the one number here that tells you what to do differently: an empty bar on Thursday is a muscle you still have time to train.',
  },
  {
    id: 'num-streak',
    q: 'How does the streak work?',
    group: 'Your numbers',
    aliases: ['week streak', 'grid', '28 days', 'consistency'],
    a: 'It counts weeks that met the days you said you would train, not consecutive days, so a rest day costs nothing and a quiet current week cannot break the run behind it. The grid above it is the last 28 days, one dot per day trained.',
  },
  {
    id: 'num-max-drop',
    q: 'Why did my estimated max go down?',
    group: 'Your numbers',
    aliases: ['estimate dropped', 'max went down', 'losing strength', 'e1rm fell'],
    a: 'Because the estimate reads your recent hard sets, and a set taken further from failure produces a lower estimate even at the same weight. A light day, a session cut short, a set you stopped with three left in the tank: all of those pull it down without anything being wrong. Read the line over months rather than between two sessions. If it is genuinely flat or falling across a whole block, that is a real signal and the deload and stuck lifts answers are the place to go.',
  },
  {
    id: 'num-wave',
    q: 'What is a training block?',
    group: 'Your numbers',
    aliases: ['six week block', 'deload', 'mesocycle', 'effort cycle', 'block week', 'training block'],
    a: 'Six weeks, optional, switched on from your profile. A groove week to find the loads, two build weeks at two reps in reserve, a push week at one, a peak week where last sets go to the end, then a deload at half the sets. The deload is the point: it is the week the other five turn into progress. Six is the floor rather than the target, because three weeks is not long enough for the body to finish adapting before the cycle restarts. The card on the Calendar tab says which week you are in and reads your session scores back against what the week asks for.',
  },
  {
    id: 'num-sets-bar-empty',
    q: 'Why is my sets per muscle bar low?',
    group: 'Your numbers',
    aliases: ['sets per muscle low', 'bar not full', 'not enough sets', 'volume low'],
    a: 'Because that muscle has had fewer hard sets this week than the range most people grow on, which is roughly ten to twenty. It is a prompt, not a scolding, and one thin week means nothing. If a muscle is consistently short, either the split is not reaching it or the sessions are being cut early.',
  },
  {
    id: 'num-why-no-pr',
    q: 'Why did a good set not count as a PR?',
    group: 'Your numbers',
    aliases: ['no pr', 'why not a record', 'should have been a pr', 'pr missed'],
    a: 'A record is your best at that number of reps, so a heavy set of five does not beat a heavier set of three, and neither beats your best at five. Sets with nothing logged in them do not count at all. If a set genuinely should have counted, it is almost always a weight or rep typo in the row.',
  },
  {
    id: 'num-estimate-vs-real',
    q: 'Is my estimated max what I could actually lift?',
    group: 'Your numbers',
    aliases: ['estimate accurate', 'could i lift that', 'real max', 'how accurate'],
    a: 'Roughly, and it gets less accurate the further the set is from a single. An estimate from a hard set of three is close; one from a set of fifteen is a guess. Use it as a trend line rather than a number to walk up to the rack and attempt.',
  },
]

// --- The basics --------------------------------------------------------------

const BASICS: KnowledgeEntry[] = [
  {
    id: 'basic-core-what-for',
    q: 'What is core training actually for?',
    group: 'The basics',
    aliases: ['core training', 'abs', 'dead bug', 'bird dog', 'pallof press', 'anti rotation', 'plank why', 'core exercises'],
    a: 'Mostly for resisting movement, not producing it. Your midsection spends real life stopping your spine bending, arching and twisting under load, so the exercises that train it best are the ones where nothing moves: planks, dead bugs, bird dogs, Pallof presses, carries. Crunches and leg raises still have a place, they are just the smaller half of the job, and a lot of the newer looking core work is simply this idea done properly.',
  },
  {
    id: 'basic-dead-bug',
    q: 'How do I do a dead bug?',
    group: 'The basics',
    aliases: ['dead bug', 'deadbug', 'opposite arm and leg', 'lying core exercise'],
    a: 'On your back, knees and arms up over you, lower back pressed flat into the floor. Lower one arm behind your head and the opposite leg toward the floor, slowly, only as far as you can go while the lower back stays flat. Come back and swap sides. The trick is that your torso does not move at all: it looks like a slow motion crunch and is the opposite of one, and the moment your back arches off the floor the set is over.',
  },
  {
    id: 'basic-cant-pull-up',
    q: 'I cannot do a pull up yet. What do I do?',
    group: 'The basics',
    aliases: ['cant do a pull up', 'first pull up', 'assisted pull up', 'no pull ups yet', 'push up too hard'],
    a: 'Work the same movement in an easier form until you can. Band assisted or machine assisted pull ups let you train the full range with help you can gradually remove. Negatives, where you jump to the top and lower as slowly as possible, build the same strength from the other end. Inverted rows and lat pulldowns cover the pattern in the meantime. The same ladder exists for push ups: incline, then knees, then the floor.',
  },
  {
    id: 'basic-superset',
    q: 'What is a superset?',
    group: 'The basics',
    aliases: ['superset meaning', 'back to back exercises', 'antagonist superset', 'paired sets'],
    a: 'Two exercises done back to back with no rest between them, then a rest before the next round of the pair. Pairing muscles that do not compete, like a row with a press, saves real time and costs almost nothing in performance. It is a time tool, not a growth trick, and this app treats a superset as one unit: grouped on screen, one rest clock, started after the last movement.',
  },
  {
    id: 'basic-dropset',
    q: 'What is a drop set?',
    group: 'The basics',
    aliases: ['drop set meaning', 'strip set', 'running the rack'],
    a: 'Take a set close to failure, immediately cut the weight by 10 to 30 percent, and keep going for more reps. So 130 x 12 straight into 110 x 15 is one drop set. It buys extra hard work in very little time and grows muscle about as well as the same work done as straight sets. Log it as another set row at the lighter weight; nothing else is needed.',
  },
  {
    id: 'basic-rpe',
    q: 'How hard should a set be?',
    group: 'The basics',
    aliases: ['rpe', 'rir', 'reps in reserve', 'how close to failure', 'how hard to push', 'reps left in the tank'],
    a: 'Stop when you have 1 to 3 reps left in you. That is the range that builds muscle without wrecking you, and you can judge it by feel: if the last rep slowed right down and the next one looked doubtful, that is about two left. You do not need to write a number down for this. The app asks once, when the session ends, how the whole thing felt on a 1 to 10 dial, which is a question you can answer honestly in a way that guessing reps in reserve mid-set never was.',
  },
  {
    id: 'basic-sets-reps',
    q: 'How many sets and reps should I do?',
    group: 'The basics',
    aliases: ['what does 3x8 mean', 'how many reps to build muscle', 'rep ranges', 'is 3 sets enough'],
    a: '3x8 means three sets of eight reps. Muscle grows across a wide range, roughly 5 to 20 reps, as long as sets end close to failure, so the range matters less than the effort. A good week lands about 10 hard sets per muscle, which is exactly what the weekly bars on the Progress tab count.',
  },
  {
    id: 'basic-start-weight',
    q: 'How much weight should I start with?',
    group: 'The basics',
    aliases: ['starting weight', 'how heavy should I go', 'is the weight too heavy', 'empty bar'],
    a: 'Lighter than feels impressive. Pick a weight you can lift for your target reps with clean form while finishing the set feeling like 2 to 3 reps were left. On barbell lifts, starting near the empty bar and learning the movement is normal. Where you start barely matters, because the whole game is adding to it steadily, and the log is how you see that happening.',
  },
  {
    id: 'basic-rest',
    q: 'How long should I rest between sets?',
    group: 'The basics',
    aliases: ['rest time', 'rest between sets', 'is 30 seconds enough'],
    a: 'Roughly 2 to 3 minutes on big lifts, 1 to 2 on smaller ones. Too little rest quietly costs reps on the later sets, which costs growth. The timer here starts itself when a set is complete and is sized to the movement and your goal, so mostly you just lift when it says so.',
  },
  {
    id: 'basic-failure',
    q: 'Should I train to failure?',
    group: 'The basics',
    aliases: ['go to failure', 'leave reps in the tank', 'max out every set'],
    a: 'No. Stopping 1 to 3 reps short builds essentially the same muscle as grinding to zero, with far less wear. The effort has to be real, the last reps should be slow, but the set does not have to end in a failed rep. The exception is the peak week of a training block, where last sets deliberately go to the end.',
  },
  {
    id: 'basic-soreness',
    q: 'Why am I sore, and can I train while sore?',
    group: 'The basics',
    aliases: ['doms', 'muscle soreness', 'sore two days later', 'train sore', 'not sore anymore'],
    a: 'Soreness peaks 1 to 3 days after unfamiliar work and fades as your body adapts. It is not a scorecard: its absence does not mean the session failed, and chasing it is chasing the wrong thing. Mild soreness is fine to train through. If it is bad enough to change your form, train something else today. Sharp pain in a joint is not soreness, and it is a stop.',
  },
  {
    id: 'basic-compound',
    q: 'What are compound and isolation exercises?',
    group: 'The basics',
    aliases: ['compound vs isolation', 'multi joint', 'exercise order', 'big lifts first'],
    a: 'Compounds move several joints at once, like presses, rows and leg presses. Isolations move one, like curls and lateral raises. Most of your results come from compounds done early while you are fresh, with isolations after, which is exactly the order generated sessions here arrive in.',
  },
  {
    id: 'basic-machines',
    q: 'Are machines or free weights better?',
    group: 'The basics',
    aliases: ['machines vs free weights', 'are machines cheating', 'smith machine'],
    a: 'Neither. Matched for effort and volume they build the same muscle. Machines are easier to learn and safer to push hard on alone; free weights train balance and cover more muscle per movement. Use what you will actually progress on, and mix freely.',
  },
  {
    id: 'basic-warmup',
    q: 'How should I warm up?',
    group: 'The basics',
    aliases: ['warm up sets', 'stretching before lifting', 'ramp up sets'],
    a: 'A few minutes of easy movement, then 2 to 3 ramping sets of your first exercise, roughly half then three quarters of the working weight for falling reps. Later movements for the same muscles need little or nothing. Long stretching before lifting is not required, and warm up sets are free technique practice. Warm up sets do not need logging, only the work does.',
  },
  {
    id: 'basic-bulky',
    q: 'Will lifting make me bulky?',
    group: 'The basics',
    aliases: ['toned not big', 'women bulky', 'get huge'],
    a: 'Not by accident. Visible muscle takes months to years of deliberate training plus deliberate eating, and nobody wakes up bulky. Toned is muscle with less fat over it, which is precisely what lifting builds. You steer the outcome with load, volume and food, and it steers slowly.',
  },
  {
    id: 'basic-results',
    q: 'How long until I see results?',
    group: 'The basics',
    aliases: ['newbie gains', 'when will I look different', 'how long to build muscle'],
    a: 'Strength moves inside 2 to 4 weeks. The mirror moves in 6 to 12. The fast early phase lasts roughly the first year. Judge progress by the log, not the mirror: the numbers move first, and the charts on the Progress tab exist to show them moving.',
  },
  {
    id: 'basic-restdays',
    q: 'Do I need rest days?',
    group: 'The basics',
    aliases: ['lift every day', 'overtraining', 'how many rest days', '48 hours'],
    a: 'Yes. A muscle wants about 48 hours before the next hard session, and 1 to 3 rest days a week is normal at every level. That is why the streak here counts weeks that met your plan, never consecutive days: a rest day costs you nothing.',
  },
  {
    id: 'basic-missed',
    q: 'What if I miss a workout or a week?',
    group: 'The basics',
    aliases: ['skipped a week', 'lose gains', 'restart program', 'coming back after a break'],
    a: 'A missed session means nothing: do the next one. Muscle takes weeks of full stop to fade, and after 2 or more weeks away, restarting about 10 percent lighter gets you back fast because rebuilt strength returns quicker than it was earned. The ghost line tells you exactly where you left off.',
  },
  {
    id: 'basic-cardio',
    q: 'Does cardio hurt my gains?',
    group: 'The basics',
    aliases: ['cardio before or after lifting', 'running and lifting', 'cardio kills gains'],
    a: 'Only at volumes most people never do. Lift first when both share a day, keep most cardio easy, and know that hard running interferes more than cycling. For general fitness the two are teammates, not rivals.',
  },
  {
    id: 'basic-recomp',
    q: 'Can I lose fat and build muscle at the same time?',
    group: 'The basics',
    aliases: ['body recomposition', 'bulk or cut', 'scale not moving'],
    a: 'As a newer lifter, yes: lift hard, eat enough protein, and hold a small calorie deficit or maintenance. The scale can sit still while your shape changes, so trust measurements and logged strength over weight. Diet planning beyond that headline is outside this app, deliberately.',
  },
  {
    id: 'basic-protein',
    q: 'How much protein do I need?',
    group: 'The basics',
    aliases: ['protein per day', 'protein shake', 'what to eat to build muscle'],
    a: 'The consensus headline: roughly 0.7 to 1 g per lb of bodyweight per day, and the daily total matters far more than timing around the workout. Beyond that one line, nutrition is outside this app: no calorie targets, no meal plans, no pretending. A tool that takes food seriously is the right place for those.',
  },
  {
    id: 'basic-pain',
    q: 'Something hurts when I lift. Should I push through?',
    group: 'The basics',
    aliases: [
      'pain when lifting', 'knee pain', 'back hurts', 'injury or soreness',
      'rotator cuff', 'shoulder pain', 'elbow pain', 'wrist pain', 'hip pain',
      'tendon tendonitis', 'strain sprain', 'pulled muscle', 'torn muscle',
      'tweaked something', 'herniated disc sciatica', 'impingement',
      'sharp twinge', 'hurt myself', 'train around an injury',
      'hamstring', 'quad', 'calf', 'groin', 'chest', 'bicep', 'tricep', 'neck',
      'ankle', 'lower back', 'shoulder', 'elbow', 'knee', 'wrist', 'hip',
      'tennis elbow', 'golfers elbow', 'rotator', 'cuff', 'torn', 'sprained',
    ],
    a: 'No. Sharp pain, joint pain, or pain that persists is a question for a clinician, and this app will not diagnose it. Stop the movement that hurts, train around it, and get it looked at if it lasts or worsens. Flagging the joint on your profile makes sessions swap around it in the meantime. Next day muscle soreness is different and normal.',
  },
  {
    id: 'basic-sleep',
    q: 'Does sleep actually matter for lifting?',
    group: 'The basics',
    aliases: ['sleep and muscle', 'not sleeping enough', 'tired all the time', 'recovery sleep'],
    a: 'More than any supplement and more than the exact split you run. Training is the stimulus and the rest of it happens while you are asleep: short sleep costs you strength on the day and recovery across the week, and it shows up first as sessions that feel heavier than the numbers say they should. If you are choosing between an extra hour of sleep and an extra session, take the sleep.',
  },
  {
    id: 'basic-age',
    q: 'Am I too old to start lifting?',
    group: 'The basics',
    aliases: ['starting at 50', 'starting at 60', 'too old to lift', 'older beginner'],
    a: 'No. Resistance training is one of the few things that meaningfully holds off the loss of muscle and bone that comes with age, and beginners in their fifties, sixties and beyond respond to it. What changes is not whether you should lift but how fast you add weight and how much recovery you leave between hard sessions, and the app already leans conservative on both. If you have a heart condition or a joint problem, clear it with a clinician first.',
  },
  {
    id: 'basic-equipment',
    q: 'What if my gym does not have the equipment?',
    group: 'The basics',
    aliases: ['no machine', 'home gym', 'only dumbbells', 'missing equipment', 'busy gym'],
    a: 'Swap it. Every exercise in a session has a swap button that offers movements training the same thing with what you do have, and if you answered that a piece of equipment is not available, the app stops programming it altogether. A dumbbell version of a barbell lift is not a compromise worth worrying about, and a machine that is occupied is not a reason to skip the session.',
  },
  {
    id: 'basic-belt',
    q: 'Should I wear a lifting belt?',
    group: 'The basics',
    aliases: ['lifting belt', 'belt for deadlifts', 'belt for squats', 'do i need a belt', 'straps and belts'],
    a: 'Not to make progress, and not on most of your sets. A belt gives your abdominal brace something to push against, which is worth a little on genuinely heavy squats and deadlifts. What it does not do is protect a back that is being loaded badly, and leaning on one early means never learning to brace without it. Learn the brace first, keep your warm ups and moderate sets beltless, and if you buy one, save it for your heaviest work.',
  },
  {
    id: 'basic-supplements',
    q: 'Do I need supplements?',
    group: 'The basics',
    aliases: ['creatine', 'pre workout', 'protein powder needed'],
    a: 'No supplement is required for progress, and this app does not give supplement advice. The honest summary: creatine monohydrate is the only one with deep evidence behind a modest benefit, most of the rest is marketing, and anything beyond that belongs with a professional, not a training log.',
  },
  {
    id: 'basic-how-many-exercises',
    q: 'How many exercises should a session have?',
    group: 'The basics',
    aliases: ['how many exercises', 'exercises per workout', 'session length', 'too many exercises', 'enough movements'],
    a: 'Four to seven for most people, with the heaviest two or three first. Past that you are adding fatigue rather than stimulus, and the last movements get done badly because everything before them already happened. If you have told the app how long you have got, it trims the session to fit rather than handing you a list you will abandon halfway.',
  },
  {
    id: 'basic-order',
    q: 'Does the order of exercises matter?',
    group: 'The basics',
    aliases: ['exercise order', 'what first', 'squats first', 'order of movements'],
    a: 'Yes, and it is mostly one rule: do the thing that demands the most while you are freshest. Heavy compounds first, isolation after, core and calves near the end. The exception is when one muscle is your priority, in which case it earns the front of the session even if it is a smaller movement.',
  },
  {
    id: 'basic-breathing',
    q: 'How should I breathe when lifting?',
    group: 'The basics',
    aliases: ['breathing', 'hold my breath', 'when to exhale', 'valsalva safe'],
    a: 'Breathe in before the hard part, hold while you brace through it, and out at the top. On lighter work you can simply breathe out on the way up. Holding briefly under a heavy set is normal and gives your spine something to work against; if you have blood pressure problems, raise it with a clinician rather than a training app.',
  },
  {
    id: 'basic-stretching',
    q: 'Should I stretch before or after?',
    group: 'The basics',
    aliases: ['stretching', 'static stretch', 'warm up stretch', 'flexibility'],
    a: 'Not statically before. Holding a long stretch immediately before lifting slightly reduces what you can produce for the next twenty minutes or so. Move through the range instead: a few light sets of the movement you are about to do is the best warm up there is. Static stretching afterwards, or on another day, is fine and pleasant.',
  },
  {
    id: 'basic-cardio-timing',
    q: 'When should I do cardio?',
    group: 'The basics',
    aliases: ['cardio timing', 'before or after lifting', 'run then lift', 'cardio same day'],
    a: 'After lifting, or on a different day, if strength and size are the point. Hard cardio beforehand takes away from the session that is actually driving the adaptation you want. Easy cardio is largely harmless whenever you do it, and walking is close to free.',
  },
  {
    id: 'basic-sick',
    q: 'Should I train when I am ill?',
    group: 'The basics',
    aliases: ['training sick', 'cold', 'flu', 'under the weather', 'fever'],
    a: 'Above the neck and mild, a lighter session is usually fine and sometimes helps. A fever, body aches, or anything in your chest means rest, and that is not a training question. Nothing is lost by taking a week off: strength is very slow to fade compared with how quickly it feels like it should.',
  },
  {
    id: 'basic-travel',
    q: 'What do I do when I am travelling?',
    group: 'The basics',
    aliases: ['travel', 'hotel gym', 'away from my gym', 'holiday'],
    a: 'Train what the room has. Say what equipment is available and the plan rebuilds around it, and if there is nothing, an away day of bodyweight work still counts toward your week. Two weeks of imperfect training beats two weeks of none by a distance nobody who has done both would argue with.',
  },
  {
    id: 'basic-women',
    q: 'Should women train differently?',
    group: 'The basics',
    aliases: ['women', 'female', 'train differently', 'womens programming'],
    a: 'No, not in any way that changes the programming. The same movements, the same rep ranges and the same progression apply. Average starting strength differs, recovery between sessions is often slightly better, and the muscle groups people want to prioritise differ, which is what the goal question is for rather than a separate program.',
  },
  {
    id: 'basic-two-days',
    q: 'Can I get anywhere on two days a week?',
    group: 'The basics',
    aliases: ['two days a week', 'only two sessions', 'minimum days', 'not enough time'],
    a: 'Yes, if both days are full body and you are honest about effort. Two hard full body sessions covers most of what three would, and it is far better than the four day plan you skip. This app asks for three as a minimum because a split needs somewhere to go, but two real sessions beats three imagined ones.',
  },
  {
    id: 'basic-machines-only',
    q: 'Can I build muscle on machines alone?',
    group: 'The basics',
    aliases: ['machines only', 'no free weights', 'just machines', 'planet fitness'],
    a: 'Yes. Muscle responds to tension and effort, and it cannot tell what the weight is attached to. Machines are easier to learn, easier to take close to failure safely on your own, and easier to progress in small steps. You give up some of the balance and coordination that free weights build, which matters for sport and much less for size.',
  },
  {
    id: 'basic-what-to-eat-before',
    q: 'Should I eat before training?',
    group: 'The basics',
    aliases: ['eat before training', 'fasted', 'pre workout meal', 'empty stomach'],
    a: 'If it feels better, yes, an hour or two before, with some carbohydrate in it. Training fasted is not harmful and does not burn meaningfully more fat over a day. What matters far more is total food and total protein across the whole day, and neither is decided by the hour before your session.',
  },
  {
    id: 'basic-alcohol',
    q: 'Does drinking affect my training?',
    group: 'The basics',
    aliases: ['alcohol', 'drinking', 'beer', 'hangover'],
    a: 'Yes, mostly through sleep and through the next session rather than through some direct effect on muscle. A heavy night blunts recovery for a day or two and makes hard training feel much harder. A drink is not going to undo a week; it is worth knowing what it costs rather than pretending it costs nothing.',
  },
]

// --- Getting stronger --------------------------------------------------------

const STRONGER: KnowledgeEntry[] = [
  {
    id: 'strong-progression',
    q: 'How should I increase my weights week by week?',
    group: 'Getting stronger',
    aliases: ['add weight', 'when to increase weight', 'double progression', 'progress weights weekly'],
    a: 'Use double progression: pick a rep range, keep the weight fixed, and add reps across sessions. When you hit the top of the range on every set with clean form, add the smallest jump available and drop back to the bottom. Reps and load build muscle interchangeably, so a rep added is progress the same as a pound added. The coach line here says exactly this at the moment it applies: add a rep, or try a specific new weight.',
  },
  {
    id: 'strong-overload',
    q: 'What is progressive overload?',
    group: 'Getting stronger',
    aliases: ['progressive overload meaning', 'do more over time'],
    a: 'Doing slightly more over time: a rep, a pound, a set. It is the single mechanism behind nearly all progress, and it only works when you know what last time was, which is the entire reason a log exists. The ghost line above your sets is progressive overload made visible.',
  },
  {
    id: 'strong-increments',
    q: 'How big should each weight jump be?',
    group: 'Getting stronger',
    aliases: ['how much weight to add', 'increment size', 'dumbbell jumps too big', 'fractional plates'],
    a: 'Lower body barbell lifts take 5 to 10 lb, upper body 2.5 to 5. Dumbbells jump about 5 lb a hand, which can be a 10 to 15 percent leap, so expect 2 to 4 weeks of rep building between jumps. Machine pins often move 10 to 15 lb at once: use the small add on plates if the stack has them, or widen your rep range and ride reps longer. When the smallest jump is still too big, more reps at the same weight is the move, not a grinded jump.',
  },
  {
    id: 'strong-rates',
    q: 'How fast should I be progressing?',
    group: 'Getting stronger',
    aliases: ['realistic progress', 'newbie linear progression', 'adding weight every session'],
    a: 'New lifters can add small amounts every session or week for roughly the first 3 to 6 months. After that, progress moves to monthly: think 5 to 10 lb a month on leg work and 2.5 to 5 on pressing, earned through reps in between. When session to session jumps start grinding for 2 to 3 sessions running, that is not failure, that is graduation to the slower, permanent pace.',
  },
  {
    id: 'strong-hold',
    q: 'When should I not add weight?',
    group: 'Getting stronger',
    aliases: ['should I add weight', 'form breaking down', 'missed reps', 'bad sleep training'],
    a: 'Hold the load when form broke on the last reps, when you missed the target, or when the same weight suddenly feels a good deal harder than last week. Reps that only happened through grinding did not earn a jump. On short sleep or heavy life weeks, cut the load 5 to 10 percent, hit the same reps, and let the week pass. Progress is judged across weeks, never against one bad day.',
  },
  {
    id: 'strong-plateau',
    q: 'My lifts are stuck. What do I do?',
    group: 'Getting stronger',
    aliases: ['plateau', 'not making progress', 'stalled bench', 'cant add weight'],
    a: 'First read the log: were you actually adding reps or load, or repeating the same session? Then, in order: add reps before weight, take smaller jumps, or back off about 10 percent and rebuild past the sticking point over 2 to 3 weeks. Sleep and food break more plateaus than programs do. The charts on the Progress tab make a real plateau visible as a flat line, which is different from a noisy one.',
  },
  {
    id: 'strong-deload',
    q: 'What is a deload?',
    group: 'Getting stronger',
    aliases: ['deload week', 'easy week', 'week off'],
    a: 'A planned easy week: about half the sets at 60 to 70 percent of normal weight, nothing hard. Take one when performance grinds for 2 straight sessions despite decent sleep and food, or roughly every 4 to 8 weeks of hard training. Strength does not leave in a week, and the light week is what buys the next two months of progress.',
  },
  {
    id: 'strong-1rm',
    q: 'What is a 1RM and should I test mine?',
    group: 'Getting stronger',
    aliases: ['one rep max', 'test my max', 'max out'],
    a: 'The most you can lift once. Testing it is a skill with real risk and near zero information that a hard set of 3 to 8 reps does not already give: the app estimates your max from every weighted set and charts it on the Progress tab. Watch the estimate climb instead of testing the real thing, especially in your first year.',
  },
  {
    id: 'strong-how-long-block',
    q: 'How many weeks should I run the same plan?',
    group: 'Getting stronger',
    aliases: ['how long same plan', 'when to change program', 'weeks per block', 'program hopping'],
    a: 'Four to six, then an easier week, then go again. Long enough for the weights to actually climb, short enough that you have not been grinding the same fatigue for months. Changing program every fortnight is the most reliable way to never find out whether anything was working.',
  },
  {
    id: 'strong-change-exercises',
    q: 'When should I swap an exercise out?',
    group: 'Getting stronger',
    aliases: ['change exercise', 'bored of an exercise', 'swap movement', 'stale'],
    a: 'When it hurts, when it has stopped progressing for several weeks despite everything else being in order, or when you genuinely cannot get access to it. Boredom is a weaker reason than people think: the movements you have done longest are the ones you are best at loading, and novelty feels like progress without being it.',
  },
  {
    id: 'strong-small-jumps',
    q: 'The dumbbells jump too much. What do I do?',
    group: 'Getting stronger',
    aliases: ['dumbbells jump', 'five pound jump', 'too big an increase', 'microloading'],
    a: 'Add reps instead of weight. Stay at the current dumbbell until you are at the top of your rep range on every set, then take the jump and drop back down the range. That is double progression, and it is the answer to any equipment that increases in steps too big for you, which is most dumbbell racks.',
  },
  {
    id: 'strong-bodyweight-progress',
    q: 'How do I progress bodyweight exercises?',
    group: 'Getting stronger',
    aliases: ['progress push ups', 'bodyweight progression', 'more reps', 'harder variation'],
    a: 'Reps first, then leverage, then load. Work up the rep range, then move to a harder version of the movement, then start adding weight with a belt or a vest. A push up becomes a deficit push up becomes a weighted push up, and each step buys you months.',
  },
  {
    id: 'strong-how-fast',
    q: 'How fast should the weights actually go up?',
    group: 'Getting stronger',
    aliases: ['how fast progress', 'rate of progress', 'realistic gains', 'beginner gains'],
    a: 'Fast at first and then slowly, and the slowdown is not you doing something wrong. A beginner can add weight most weeks for a few months. After a year, adding to a lift every month or two is real progress. After several years, a handful of pounds on a main lift in a year is a good year.',
  },
  {
    id: 'strong-both',
    q: 'Can I train for strength and size at once?',
    group: 'Getting stronger',
    aliases: ['strength and size', 'both at once', 'powerbuilding', 'heavy and light'],
    a: 'Yes, and most people should. Heavier work in lower rep ranges on the main lifts, moderate reps on everything else. The two goals overlap far more than the internet suggests; they only genuinely diverge at a level of specialisation most people never need to reach.',
  },
  {
    id: 'strong-warm-up-sets',
    q: 'How many warm up sets should I do?',
    group: 'Getting stronger',
    aliases: ['warm up sets', 'how many warm ups', 'ramp up', 'working up to weight'],
    a: 'Two or three on the first heavy movement, fewer on everything after it. Go up in reasonably big jumps with few reps, so you arrive warm rather than tired. Isolation work usually needs one, or none if it comes after something that already trained the same muscle.',
  },
  {
    id: 'strong-missed-progress',
    q: 'I hit my reps but it felt easy. Now what?',
    group: 'Getting stronger',
    aliases: ['felt easy', 'too light', 'hit all my reps', 'add weight now'],
    a: 'Add weight next session, and add more than you were planning to. Hitting the top of the range across every set with reps to spare means the weight was chosen too conservatively, which is common when coming back from a break. The log is the evidence; trust it over the plan.',
  },
]

// --- Words you will see ------------------------------------------------------
//
// The jargon, defined. A question is something somebody thought to ask; a term
// is something they read on a screen and did not want to admit they did not
// know. Different shape, same search box, so RIR finds the definition of RIR
// rather than a paragraph about effort that happens to mention it.
const WORDS: KnowledgeEntry[] = [
  {
    id: 'w-anti-movement',
    q: 'What is anti-extension and anti-rotation?',
    group: 'Words you will see',
    aliases: ['anti extension', 'anti rotation', 'anti lateral flexion', 'bracing exercises'],
    a: 'The names for core work whose job is to stop something happening. Anti-extension resists your lower back arching, which is a plank, a dead bug or an ab wheel. Anti-rotation resists twisting, which is a Pallof press. Anti-lateral-flexion resists bending sideways, which is a suitcase carry. If an exercise looks like nothing is happening, this is usually why.',
  },
  {
    id: 'w-regression',
    q: 'What are regressions and progressions?',
    group: 'Words you will see',
    aliases: ['regression', 'progression', 'easier version', 'harder version', 'scaling'],
    a: 'The same movement made easier or harder. An incline push up is a regression of a push up, a weighted one is a progression. Bodyweight training runs almost entirely on this: you cannot take five pounds off a pull up, so you change the leverage or add help instead. A plan asking for something you cannot do yet is a plan missing its regression, not a plan you have failed.',
  },
  {
    id: 'w-hypertrophy',
    q: 'What is hypertrophy?',
    group: 'Words you will see',
    aliases: ['hypertrophy', 'muscle growth', 'getting bigger'],
    a: 'Muscle getting physically bigger. It is the goal most people mean when they say they want to build muscle, and it comes from taking sets close to failure often enough, with enough total work, while eating enough to build with. Strength and size overlap heavily but are not the same thing: you can get a lot stronger before you look much different.',
  },
  {
    id: 'w-rir',
    q: 'What is RIR?',
    group: 'Words you will see',
    aliases: ['rir', 'reps in reserve', 'how many left in the tank'],
    a: 'Reps in reserve. How many more you could have done before the bar stopped moving. Two RIR means you stopped with two left. It is the honest way to describe effort, because a weight that is hard for you today might be a warm up for somebody else, and the number that matters is how close to your limit you got.',
  },
  {
    id: 'w-rpe-term',
    q: 'What is RPE?',
    group: 'Words you will see',
    aliases: ['rpe', 'rate of perceived exertion', 'effort scale'],
    a: 'Rate of perceived exertion, a one to ten scale of how hard a set felt. Ten is nothing left, eight is two reps left, and most productive work sits somewhere between seven and nine. It is the same idea as reps in reserve counted from the other end. This app does not ask you for it, on purpose, but you will see it everywhere else.',
  },
  {
    id: 'w-failure-term',
    q: 'What does training to failure mean?',
    group: 'Words you will see',
    aliases: ['failure', 'to failure', 'technical failure', 'amrap'],
    a: 'Failure is the point where another rep will not happen. Technical failure is earlier and more useful: the point where the next rep would break your form. AMRAP means as many reps as possible, a set taken to one of those two points rather than to a number. Most of your sets should stop short of either.',
  },
  {
    id: 'w-volume-term',
    q: 'What is volume?',
    group: 'Words you will see',
    aliases: ['volume', 'training volume', 'hard sets'],
    a: 'How much work you did, usually counted as hard sets per muscle per week. Ten to twenty sets a week per muscle covers most people. Volume load, or tonnage, is a different number: sets times reps times weight, which is what the pounds figure on a finished session is showing you.',
  },
  {
    id: 'w-intensity',
    q: 'What is intensity?',
    group: 'Words you will see',
    aliases: ['intensity', 'how heavy', 'percentage of max'],
    a: 'How heavy the weight is relative to what you could lift once, usually written as a percentage. Confusingly, people also use intensity to mean how hard a set felt, which is effort, not intensity. When a program says high intensity it means heavy. When your friend says it, they probably mean it hurt.',
  },
  {
    id: 'w-frequency',
    q: 'What is frequency?',
    group: 'Words you will see',
    aliases: ['frequency', 'how often', 'times per week'],
    a: 'How often you train something. Twice a week per muscle beats once for most people at the same total volume, which is the main argument for a split that comes back around rather than one that hits everything a single time. It is why Push Pull Legs run twice through is a common six day week.',
  },
  {
    id: 'w-progressive-overload-term',
    q: 'What is progressive overload?',
    group: 'Words you will see',
    aliases: ['progressive overload', 'overload', 'adding weight over time'],
    a: 'Asking your body to do slightly more than last time, week after week. More weight, more reps, better control, less rest, more sets: any of them count. Without it, the same three sets forever produce the same body forever, which is the single most common reason somebody trains for a year and looks the same.',
  },
  {
    id: 'w-eccentric',
    q: 'What are the eccentric and concentric?',
    group: 'Words you will see',
    aliases: ['eccentric', 'concentric', 'isometric', 'lowering', 'negative'],
    a: 'The concentric is the lifting half, the eccentric is the lowering half, and an isometric is holding still. The eccentric is where most of the muscle damage and a good deal of the growth comes from, which is why control on the way down is worth more than speed on the way up, and why the lowering phase is the one to slow down.',
  },
  {
    id: 'w-tempo',
    q: 'What is tempo?',
    group: 'Words you will see',
    aliases: ['tempo', '3010', 'slow reps', 'time under tension'],
    a: 'How fast each part of a rep goes, often written as four numbers: lowering, pause at the bottom, lifting, pause at the top. A 3010 is a three second lower, no pause, a normal lift, no pause. Time under tension is the same idea stated as a total. Neither is required, but controlling the lower is.',
  },
  {
    id: 'w-rom',
    q: 'What is range of motion?',
    group: 'Words you will see',
    aliases: ['range of motion', 'rom', 'full range', 'partials', 'lengthened partials'],
    a: 'How far the muscle travels between the stretched position and the shortened one. Full range generally builds more than a short one, and the stretched end matters most, which is why a deep lower on a chest press beats a heavier half rep. Lengthened partials are deliberate short reps done only at the stretched end, which are a real technique and not the same as cutting a rep short because it got hard.',
  },
  {
    id: 'w-unilateral',
    q: 'What does unilateral mean?',
    group: 'Words you will see',
    aliases: ['unilateral', 'bilateral', 'single leg', 'one arm'],
    a: 'One limb at a time. A Bulgarian split squat is unilateral, a back squat is bilateral. Training one side at a time evens out differences between them, needs less total load for the same effect on each side, and is harder to cheat. It also takes roughly twice as long, which is the tradeoff.',
  },
  {
    id: 'w-compound-term',
    q: 'What is a compound, and an accessory?',
    group: 'Words you will see',
    aliases: ['compound', 'isolation', 'accessory', 'main lift'],
    a: 'A compound moves more than one joint and trains several muscles at once: squats, presses, rows. An isolation moves one joint: curls, extensions, raises. Accessory work is whatever supports the main lifts, usually the isolation work and the lighter compounds. Sessions in this app lead with compounds because they are the ones worth doing while you are fresh.',
  },
  {
    id: 'w-hinge',
    q: 'What is a hinge, a squat, a push and a pull?',
    group: 'Words you will see',
    aliases: ['hinge', 'movement pattern', 'patterns', 'push pattern', 'pull pattern'],
    a: 'The four patterns most training is built from. A hinge bends at the hip with a fairly straight leg: deadlifts, Romanian deadlifts, good mornings. A squat bends knee and hip together. A push moves weight away from you, a pull moves it toward you. Most balanced weeks contain all four, which is what a split is really organising.',
  },
  {
    id: 'w-pr',
    q: 'What is a PR?',
    group: 'Words you will see',
    aliases: ['pr', 'personal record', 'pb', 'personal best'],
    a: 'Personal record, also written PB for personal best. Your heaviest ever for a given number of reps, or your most reps at a given weight. This app counts both, and marks the set when it happens. It is worth caring about because it is the only number in training that is entirely your own.',
  },
  {
    id: 'w-1rm-term',
    q: 'What is a 1RM?',
    group: 'Words you will see',
    aliases: ['1rm', 'one rep max', 'max', 'e1rm', 'estimated max'],
    a: 'The most you could lift once. An estimated max, or e1RM, is that number worked out from a set you actually did rather than tested directly, which is safer and nearly as informative. This app estimates it from every weighted set and charts the trend, because the trend is the useful part.',
  },
  {
    id: 'w-doms',
    q: 'What is DOMS?',
    group: 'Words you will see',
    aliases: ['doms', 'delayed onset muscle soreness', 'sore two days later'],
    a: 'Delayed onset muscle soreness, the ache that arrives a day or two after training and peaks around forty eight hours. It comes mostly from unfamiliar work and from the lowering phase, it fades as you repeat a movement, and it is not a measure of whether a session worked. Plenty of good sessions leave you fine the next day.',
  },
  {
    id: 'w-pump',
    q: 'What is a pump?',
    group: 'Words you will see',
    aliases: ['pump', 'pumped', 'swole', 'blood in the muscle'],
    a: 'The temporary swelling during and after a set, from blood and fluid gathering in the working muscle. It feels excellent and it is a reasonable sign you are training the muscle you meant to, but it is not growth and it disappears within the hour. Chasing it at the cost of load is how people stall.',
  },
  {
    id: 'w-mmc',
    q: 'What is mind muscle connection?',
    group: 'Words you will see',
    aliases: ['mind muscle connection', 'feeling the muscle', 'cue'],
    a: 'Deliberately paying attention to the muscle you are trying to work rather than to moving the weight. It measurably shifts effort toward that muscle on isolation work, and matters much less on heavy compounds where the job is to move the load. Useful on a lateral raise, a waste of attention on a heavy squat.',
  },
  {
    id: 'w-bracing',
    q: 'What is bracing?',
    group: 'Words you will see',
    aliases: ['bracing', 'brace', 'core tightness', 'valsalva'],
    a: 'Tightening your midsection so your spine has something to resist against under load. Breathe in, tighten as though about to be prodded in the stomach, then lift. The Valsalva manoeuvre is holding that breath through the hard part, which is normal on heavy sets and worth being careful with if you have blood pressure issues.',
  },
  {
    id: 'w-grip',
    q: 'What are pronated, supinated and neutral grips?',
    group: 'Words you will see',
    aliases: ['pronated', 'supinated', 'neutral grip', 'overhand', 'underhand', 'hammer grip'],
    a: 'Pronated is palms facing away or down, the usual overhand grip on a pull up or a row. Supinated is palms toward you, the underhand grip on a chin up or a barbell curl. Neutral is palms facing each other, as on a hammer curl. The grip changes which muscles get the most work, which is why the same movement appears three ways.',
  },
  {
    id: 'w-working-set',
    q: 'What is a working set?',
    group: 'Words you will see',
    aliases: ['working set', 'warm up set', 'top set', 'back off set'],
    a: 'A working set is one that counts toward the session. Warm up sets are the lighter ones leading up to it and are not logged as work here. A top set is the heaviest one of a movement, and back off sets are the lighter sets done after it. Only working sets should be near failure.',
  },
  {
    id: 'w-straight-sets',
    q: 'What are straight sets, pyramids and rest pause?',
    group: 'Words you will see',
    aliases: ['straight sets', 'pyramid', 'reverse pyramid', 'rest pause', 'cluster'],
    a: 'Straight sets are the same weight across every set, which is what this app programs by default. A pyramid adds weight and drops reps each set, a reverse pyramid does the opposite. Rest pause takes a set to near failure, rests fifteen or twenty seconds, and continues. All of them work; straight sets are the easiest to progress honestly.',
  },
  {
    id: 'w-superset-term',
    q: 'What are supersets, drop sets and giant sets?',
    group: 'Words you will see',
    aliases: ['giant set', 'circuit', 'paired sets', 'antagonist superset'],
    a: 'A superset is two movements back to back with no rest between them. A drop set is continuing a set at a lighter weight straight after failing at the heavier one. A giant set is three or more in a row. They all save time and raise how hard a session feels; none of them beat straight sets for the main lifts.',
  },
  {
    id: 'w-split-term',
    q: 'What is a split?',
    group: 'Words you will see',
    aliases: ['split', 'training split', 'ppl', 'upper lower', 'bro split'],
    a: 'How you divide the body across the week. Full body trains everything each session, upper lower alternates halves, push pull legs groups by movement pattern, and a body part split gives each muscle its own day. None is magic. The right one is the one that fits the number of days you will actually train.',
  },
  {
    id: 'w-block',
    q: 'What is a block or mesocycle?',
    group: 'Words you will see',
    aliases: ['block', 'mesocycle', 'training block', 'wave'],
    a: 'A stretch of weeks run with the same plan while the load creeps up, usually four to six, ending in an easier week before the next one starts. This app calls it a block and shows which week you are in. It exists because progress is not linear forever and a planned easy week beats an unplanned forced one.',
  },
  {
    id: 'w-deload-term',
    q: 'What is a deload?',
    group: 'Words you will see',
    aliases: ['deload', 'easy week', 'back off week', 'taper'],
    a: 'A deliberately easier week: less weight, fewer sets, or both. It lets accumulated fatigue clear so the next block starts from a better place. Skipping them works right up until it does not, and the version you get by accident, through injury or burnout, costs much more than the week you would have taken.',
  },
  {
    id: 'w-recovery',
    q: 'What is recovery?',
    group: 'Words you will see',
    aliases: ['recovery', 'recover', 'overtraining', 'fatigue'],
    a: 'Everything between sessions that turns training into adaptation: sleep, food, and time. Training is the request, recovery is where it is granted. Overtraining in the clinical sense is rare and takes months to reach; what most people actually hit is under recovering for a few weeks, which looks like flat lifts, poor sleep and no appetite for the gym.',
  },
  {
    id: 'w-bulk-cut',
    q: 'What are bulking, cutting and maintenance?',
    group: 'Words you will see',
    aliases: ['bulking', 'cutting', 'maintenance', 'recomp', 'deficit', 'surplus'],
    a: 'Eating above what you burn to build, below it to lose fat, or at it to stay put. A surplus builds muscle faster and adds some fat; a deficit does the reverse and makes building slow. Recomp is doing both slowly at once, which genuinely works for beginners and for people returning, and is frustratingly slow for everyone else.',
  },
  {
    id: 'w-tdee',
    q: 'What is TDEE?',
    group: 'Words you will see',
    aliases: ['tdee', 'maintenance calories', 'calories burned'],
    a: 'Total daily energy expenditure, an estimate of the calories you burn in a day including everything you do. It is the number a deficit or surplus is measured against. Any calculator gives you an estimate; the real one is whatever number holds your weight steady over a fortnight, which only weighing yourself will tell you.',
  },
  {
    id: 'w-macros',
    q: 'What are macros?',
    group: 'Words you will see',
    aliases: ['macros', 'macronutrients', 'protein carbs fat'],
    a: 'Protein, carbohydrate and fat, the three things calories come from. For training, protein is the one worth counting: roughly seven tenths of a gram to a gram per pound of bodyweight. Carbohydrate fuels hard sessions and fat handles hormones, and past hitting protein and total calories the split between them matters far less than people argue.',
  },
  {
    id: 'w-lockout',
    q: 'What is a lockout, and a sticking point?',
    group: 'Words you will see',
    aliases: ['lockout', 'sticking point', 'where i fail'],
    a: 'The lockout is the top of a lift, arms or legs straight. The sticking point is where the bar slows most, usually a few inches out of the bottom. Knowing which one you fail at tells you what to train: failing off the chest is different from failing at the lockout, and the fix is a different exercise.',
  },
  {
    id: 'w-prime-mover',
    q: 'What are prime movers and synergists?',
    group: 'Words you will see',
    aliases: ['prime mover', 'synergist', 'stabiliser', 'agonist'],
    a: 'The prime mover is the muscle doing most of the work, synergists help, and stabilisers hold everything else still. On a bench press the chest is the prime mover, the triceps and front delts are synergists. It matters because a session that lists an exercise under Chest is telling you which one it is meant to be training.',
  },
  {
    id: 'w-form',
    q: 'What is good form?',
    group: 'Words you will see',
    aliases: ['form', 'technique', 'good form', 'cheating reps'],
    a: 'Doing the movement the way it was meant to be done: the intended muscles working, the joints in positions they tolerate, and the same rep every time so the weight on the bar means something. Cheat reps use momentum or other muscles to move more weight, which makes the number go up and the training effect go down.',
  },
]

export const KNOWLEDGE: KnowledgeEntry[] = [...BASICS, ...STRONGER, ...APP, ...NUMBERS, ...WORDS]

// --- Search ------------------------------------------------------------------

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

// Words that are how somebody phrases a question rather than what they are
// asking about. They have to go, because half the question has to land now and
// filler counting as content makes a real question look half unmatched: "I
// think I pulled a hamstring" was three words of which one was think.
const STOP = new Set([
  'what', 'is', 'the', 'a', 'an', 'do', 'does', 'how', 'my', 'in', 'to', 'of', 'for', 'and', 'or',
  'it', 'are', 'can', 'should', 'best', 'good', 'need',
  'think', 'about', 'this', 'that', 'there', 'from', 'with', 'when', 'why', 'me', 'im', 'ive',
  'have', 'has', 'be', 'been', 'am', 'was', 'will', 'would', 'could', 'if', 'on', 'at', 'by',
  'mean', 'means', 'meaning', 'called', 'actually', 'even', 'really', 'much', 'many',
])

// Local scoring over authored text, nothing else.
//
// Two things have to be true at once, and the second is the one that matters.
// An entry has to score, and the query's own distinctive words have to be the
// reason. Without that second rule a long question piles up points from body
// text and comes back looking answered: "can I train with a torn rotator cuff"
// returned five confident entries, not one of which had ever heard of a
// rotator cuff, because train and with and cuff-adjacent prose were enough.
// A wrong answer delivered confidently to somebody asking about an injury is
// worse than no answer, which is the whole reason the gate exists.
export function searchKnowledge(query: string, limit = 6): KnowledgeEntry[] {
  const terms = [...new Set(tokens(query).filter((t) => !STOP.has(t)))]
  if (!terms.length) return []

  const scored = KNOWLEDGE.map((entry) => {
    const inQ = new Set(tokens(entry.q))
    const inAlias = new Set(entry.aliases.flatMap(tokens))
    const inBody = new Set(tokens(entry.a))
    let score = 0
    // How many of the asker's own words this entry actually names, counting
    // only the places an author chose the wording: the question and its
    // aliases. Body prose is rank, never evidence.
    let named = 0
    for (const term of terms) {
      if (inQ.has(term)) {
        score += 4
        named += 1
      } else if (inAlias.has(term)) {
        score += 3
        named += 1
      } else if (prefixHit(inQ, term) || prefixHit(inAlias, term)) {
        // prefix match keeps "supersets" finding "superset", but only between
        // real words: short fragments like "be" must never anchor a match
        score += 3
        named += 1
      } else if (inBody.has(term)) {
        score += 1
      }
    }

    return { entry, score, named }
  })

  // Half the question has to land, so a single shared word cannot carry a five
  // word question. One word asked alone still works, because "deload" is a
  // whole question and the person typing it knows it.
  const floor = Math.max(1, Math.ceil(terms.length / 2))

  return scored
    .filter((s) => s.named >= floor && s.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry)
}

function prefixHit(words: Set<string>, term: string): boolean {
  if (term.length < 4) return false
  for (const w of words) {
    if (w.length >= 4 && (w.startsWith(term) || term.startsWith(w))) return true
  }
  return false
}

export function commonQuestions(): KnowledgeEntry[] {
  return COMMON_IDS.map((id) => KNOWLEDGE.find((e) => e.id === id)).filter(
    (e): e is KnowledgeEntry => e !== undefined,
  )
}
