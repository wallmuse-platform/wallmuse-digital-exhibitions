module.exports = {
    "parser": "@babel/eslint-parser", 
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended"
    ],
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}"
            ]
        }
    ],
    "parserOptions": {
        "ecmaVersion": 2021,
        "ecmaFeatures": {
            "jsx": true // Enable JSX
        },
        "requireConfigFile": false // This option is needed for @babel/eslint-parser
    },
    "plugins": [
        "react"
    ],
    "rules": {
    }
}