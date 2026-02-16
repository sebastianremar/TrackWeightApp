'use strict';

const EXERCISE_LIBRARY = [
    // Chest (7)
    { id: 'bench-press', name: 'Bench Press', muscleGroup: 'Chest' },
    { id: 'incline-bench-press', name: 'Incline Bench Press', muscleGroup: 'Chest' },
    { id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', muscleGroup: 'Chest' },
    { id: 'incline-dumbbell-press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest' },
    { id: 'cable-fly', name: 'Cable Fly', muscleGroup: 'Chest' },
    { id: 'push-ups', name: 'Push-ups', muscleGroup: 'Chest' },
    { id: 'chest-dips', name: 'Chest Dips', muscleGroup: 'Chest' },

    // Back (7)
    { id: 'barbell-row', name: 'Barbell Row', muscleGroup: 'Back' },
    { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back' },
    { id: 'cable-row', name: 'Cable Row', muscleGroup: 'Back' },
    { id: 'pull-ups', name: 'Pull-ups', muscleGroup: 'Back' },
    { id: 'deadlift', name: 'Deadlift', muscleGroup: 'Back' },
    { id: 't-bar-row', name: 'T-Bar Row', muscleGroup: 'Back' },
    { id: 'dumbbell-row', name: 'Dumbbell Row', muscleGroup: 'Back' },

    // Shoulders (6)
    { id: 'overhead-press', name: 'Overhead Press', muscleGroup: 'Shoulders' },
    { id: 'lateral-raise', name: 'Lateral Raise', muscleGroup: 'Shoulders' },
    { id: 'front-raise', name: 'Front Raise', muscleGroup: 'Shoulders' },
    { id: 'face-pull', name: 'Face Pull', muscleGroup: 'Shoulders' },
    { id: 'arnold-press', name: 'Arnold Press', muscleGroup: 'Shoulders' },
    { id: 'reverse-fly', name: 'Reverse Fly', muscleGroup: 'Shoulders' },

    // Biceps (5)
    { id: 'barbell-curl', name: 'Barbell Curl', muscleGroup: 'Biceps' },
    { id: 'dumbbell-curl', name: 'Dumbbell Curl', muscleGroup: 'Biceps' },
    { id: 'hammer-curl', name: 'Hammer Curl', muscleGroup: 'Biceps' },
    { id: 'preacher-curl', name: 'Preacher Curl', muscleGroup: 'Biceps' },
    { id: 'cable-curl', name: 'Cable Curl', muscleGroup: 'Biceps' },

    // Triceps (5)
    { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'Triceps' },
    { id: 'skull-crusher', name: 'Skull Crusher', muscleGroup: 'Triceps' },
    { id: 'overhead-extension', name: 'Overhead Extension', muscleGroup: 'Triceps' },
    { id: 'close-grip-bench', name: 'Close Grip Bench', muscleGroup: 'Triceps' },
    { id: 'dips', name: 'Dips', muscleGroup: 'Triceps' },

    // Legs (8)
    { id: 'squat', name: 'Squat', muscleGroup: 'Legs' },
    { id: 'leg-press', name: 'Leg Press', muscleGroup: 'Legs' },
    { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscleGroup: 'Legs' },
    { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'Legs' },
    { id: 'leg-curl', name: 'Leg Curl', muscleGroup: 'Legs' },
    { id: 'lunges', name: 'Lunges', muscleGroup: 'Legs' },
    { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscleGroup: 'Legs' },
    { id: 'calf-raise', name: 'Calf Raise', muscleGroup: 'Legs' },

    // Core (5)
    { id: 'plank', name: 'Plank', muscleGroup: 'Core' },
    { id: 'crunch', name: 'Crunch', muscleGroup: 'Core' },
    { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core' },
    { id: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'Core' },
    { id: 'ab-rollout', name: 'Ab Rollout', muscleGroup: 'Core' },

    // Cardio (4)
    { id: 'running', name: 'Running', muscleGroup: 'Cardio' },
    { id: 'cycling', name: 'Cycling', muscleGroup: 'Cardio' },
    { id: 'rowing', name: 'Rowing', muscleGroup: 'Cardio' },
    { id: 'jump-rope', name: 'Jump Rope', muscleGroup: 'Cardio' },

    // Full Body (3)
    { id: 'clean-and-press', name: 'Clean and Press', muscleGroup: 'Full Body' },
    { id: 'thruster', name: 'Thruster', muscleGroup: 'Full Body' },
    { id: 'kettlebell-swing', name: 'Kettlebell Swing', muscleGroup: 'Full Body' },
];

const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
    'Legs', 'Core', 'Cardio', 'Full Body',
];

module.exports = { EXERCISE_LIBRARY, MUSCLE_GROUPS };
