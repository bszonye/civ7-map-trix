// eslint.config.js
import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        rules: {
            "no-unused-vars": [
                "warn",
                {
                    "varsIgnorePattern": "^_",
                    "argsIgnorePattern": "^_",
                }
            ]
        },
        languageOptions: {
            globals: {
                Cities: "readonly",
                Color: "readonly",
                CombatTypes: "readonly",
                ComponentValueChangeEventName: "readonly",
                Constructibles: "readonly",
                Controls: "readonly",
                Database: "readonly",
                DiplomacyActions: "readonly",
                DirectionTypes: "readonly",
                DistrictTypes: "readonly",
                Districts: "readonly",
                DomainTypes: "readonly",
                FeatureTypes: "readonly",
                Game: "readonly",
                GameContext: "readonly",
                GameInfo: "readonly",
                GameplayMap: "readonly",
                GlobalScaling: "readonly",
                GrowthTypes: "readonly",
                HTMLElement: "readonly",
                IndependentRelationship: "readonly",
                Input: "readonly",
                InputActionStatuses: "readonly",
                InputContext: "readonly",
                InputDeviceType: "readonly",
                Loading: "readonly",
                Locale: "readonly",
                MapCities: "readonly",
                MapConstructibles: "readonly",
                MapPlotEffects: "readonly",
                MapUnits: "readonly",
                PlayerIds: "readonly",
                Players: "readonly",
                ResourceTypes: "readonly",
                RevealedStates: "readonly",
                RiverTypes: "readonly",
                SpriteMode: "readonly",
                UI: "readonly",
                UIHTMLCursorTypes: "readonly",
                UnitActivityTypes: "readonly",
                Units: "readonly",
                Visibility: "readonly",
                WorldUI: "readonly",
                clearInterval: "readonly",
                clearTimeout: "readonly",
                console: "readonly",
                document: "readonly",
                engine: "readonly",
                localStorage: "readonly",
                performance: "readonly",
                requestAnimationFrame: "readonly",
                setInterval: "readonly",
                setTimeout: "readonly",
                window: "readonly",
            }
        }

    }
];
