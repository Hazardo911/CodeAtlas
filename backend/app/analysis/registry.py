from pathlib import Path

# Mapping of configuration/manifest file names to the framework keywords we should scan for inside them
MANIFEST_REGISTRY = {
    "requirements.txt": ["django", "flask", "fastapi", "pyramid", "tornado", "sanic"],
    "pyproject.toml": ["django", "flask", "fastapi", "pyramid", "tornado", "sanic"],
    "pipfile": ["django", "flask", "fastapi", "pyramid", "tornado", "sanic"],
    "poetry.lock": ["django", "flask", "fastapi", "pyramid", "tornado", "sanic"],
    "package.json": [
        "react", "vue", "angular", "next", "nuxt", "express", "nestjs", "electron",
        "react-native", "svelte", "@sveltejs/kit", "astro", "@remix-run/react", "solid-js"
    ],
    "package-lock.json": [
        "react", "vue", "angular", "next", "nuxt", "express", "nestjs", "electron",
        "react-native", "svelte", "@sveltejs/kit", "astro", "@remix-run/react", "solid-js"
    ],
    "yarn.lock": [
        "react", "vue", "angular", "next", "nuxt", "express", "nestjs", "electron",
        "react-native", "svelte", "@sveltejs/kit", "astro", "@remix-run/react", "solid-js"
    ],
    "pnpm-lock.yaml": [
        "react", "vue", "angular", "next", "nuxt", "express", "nestjs", "electron",
        "react-native", "svelte", "@sveltejs/kit", "astro", "@remix-run/react", "solid-js"
    ],
    "pom.xml": ["spring-boot", "springboot", "org.springframework"],
    "build.gradle": ["spring-boot", "springboot", "org.springframework", "com.android.application", "android"],
    "settings.gradle": ["spring-boot", "springboot", "org.springframework", "android"],
    "go.mod": ["/gin", "/fiber", "/echo"],
    "cargo.toml": ["actix-web", "actix", "rocket", "axum"],
    "composer.json": ["laravel/framework", "laravel", "symfony/framework", "symfony"],
    "cmakelists.txt": ["qt"],
    "makefile": ["qt"],
    "pubspec.yaml": ["flutter", "flutter_localizations"],
    "AndroidManifest.xml": ["android", "manifest"],
    "Podfile": ["ios", "cocoapods"],
    "Info.plist": ["uiinterfaceorientation", "uisupportedinterfaceorientations"],
}

# Wildcard patterns for configuration files
MANIFEST_WILDCARDS = [
    ("*.csproj", ["microsoft.aspnetcore"]),
    ("*.sln", ["microsoft.aspnetcore"]),
    ("vite.config.*", ["react", "vue", "angular", "svelte", "solid-js"]),
    ("webpack.config.*", ["react", "vue", "angular"]),
]

# Mapping of file extensions to code framework imports
IMPORT_REGISTRY = {
    ".py": {
        "FastAPI": ["from fastapi", "import fastapi"],
        "Flask": ["from flask", "import flask"],
        "Django": ["from django", "import django"],
        "Pyramid": ["from pyramid", "import pyramid"],
        "Tornado": ["from tornado", "import tornado"],
        "Sanic": ["from sanic", "import sanic"],
        "pytest": ["import pytest", "from pytest"],
        "unittest": ["import unittest", "from unittest"],
        "sqlite3": ["import sqlite3", "from sqlite3"],
        "sqlalchemy": ["import sqlalchemy", "from sqlalchemy"],
        "peewee": ["import peewee", "from peewee"],
        "pymongo": ["import pymongo", "from pymongo"],
        "openai": ["import openai", "from openai"],
        "langchain": ["import langchain", "from langchain"],
        "faiss": ["import faiss", "from faiss"],
    },
    ".js": {
        "Express": ["require('express')", 'require("express")', "from 'express'", 'from "express"'],
        "React": ["react", "from 'react'", 'from "react"'],
        "Vue": ["vue", "from 'vue'", 'from "vue"'],
        "NestJS": ["@nestjs", "from '@nestjs'"],
        "Electron": ["electron", "from 'electron'"],
        "React Native": ["react-native", "from 'react-native'"],
        "Svelte": ["svelte", "from 'svelte'"],
        "SolidJS": ["solid-js", "from 'solid-js'"],
        "jest": ["jest", "describe(", "test(", "it("],
        "mocha": ["mocha", "describe("],
        "mongoose": ["mongoose", "from 'mongoose'", 'from "mongoose"'],
        "sequelize": ["sequelize", "from 'sequelize'"],
        "prisma": ["@prisma/client", "prisma"],
        "openai": ["openai", "from 'openai'"],
    },
    ".jsx": {
        "React": ["react", "from 'react'", 'from "react"'],
    },
    ".ts": {
        "Express": ["require('express')", 'require("express")', "from 'express'", 'from "express"'],
        "React": ["react", "from 'react'", 'from "react"'],
        "Vue": ["vue", "from 'vue'", 'from "vue"'],
        "NestJS": ["@nestjs", "from '@nestjs'"],
        "Electron": ["electron", "from 'electron'"],
        "React Native": ["react-native", "from 'react-native'"],
        "Svelte": ["svelte", "from 'svelte'"],
        "SolidJS": ["solid-js", "from 'solid-js'"],
        "jest": ["jest", "describe(", "test(", "it("],
        "mongoose": ["mongoose", "from 'mongoose'", 'from "mongoose"'],
        "prisma": ["@prisma/client", "prisma"],
        "openai": ["openai", "from 'openai'"],
    },
    ".tsx": {
        "React": ["react", "from 'react'", 'from "react"'],
    },
    ".java": {
        "Spring Boot": ["org.springframework.boot", "org.springframework"],
        "junit": ["org.junit", "junit"],
        "hibernate": ["org.hibernate", "hibernate"],
        "Android (Native)": ["android.app", "androidx.appcompat", "android.widget", "android.content"],
    },
    ".cs": {
        "ASP.NET Core": ["Microsoft.AspNetCore"],
        "entityframework": ["Microsoft.EntityFrameworkCore"],
        "nunit": ["NUnit.Framework", "using NUnit"],
    },
    ".php": {
        "Laravel": ["Illuminate\\Support", "use Laravel\\"],
        "Symfony": ["Symfony\\Component"],
        "phpunit": ["PHPUnit\\Framework"],
    },
    ".go": {
        "Gin": ["github.com/gin-gonic/gin"],
        "Fiber": ["github.com/gofiber/fiber"],
        "Echo": ["github.com/labstack/echo"],
        "testing": ["import \"testing\"", "import (", "t *testing.T"],
    },
    ".rs": {
        "Actix": ["actix_web", "actix-web"],
        "Rocket": ["rocket"],
        "Axum": ["axum"],
        "tokio-test": ["tokio::test"],
    },
    ".rb": {
        "Ruby on Rails": ["action_controller/railtie", "active_record"],
        "Sinatra": ["sinatra"],
        "rspec": ["rspec"],
    },
    ".dart": {
        "Flutter": ["package:flutter/material.dart", "package:flutter/cupertino.dart", "package:flutter/"],
    },
    ".swift": {
        "iOS (Native)": ["UIKit", "SwiftUI"],
    },
}

# General mapping of simple keyword to normalized framework name
FRAMEWORK_NORM_MAP = {
    "django": "Django",
    "flask": "Flask",
    "fastapi": "FastAPI",
    "pyramid": "Pyramid",
    "tornado": "Tornado",
    "sanic": "Sanic",
    "react": "React",
    "vue": "Vue",
    "angular": "Angular",
    "@angular/core": "Angular",
    "next": "Next.js",
    "nuxt": "Nuxt",
    "express": "Express",
    "nestjs": "NestJS",
    "electron": "Electron",
    "spring-boot": "Spring Boot",
    "springboot": "Spring Boot",
    "org.springframework": "Spring Boot",
    "/gin": "Gin",
    "/fiber": "Fiber",
    "/echo": "Echo",
    "actix-web": "Actix",
    "actix": "Actix",
    "rocket": "Rocket",
    "axum": "Axum",
    "laravel": "Laravel",
    "laravel/framework": "Laravel",
    "symfony": "Symfony",
    "symfony/framework": "Symfony",
    "microsoft.aspnetcore": "ASP.NET Core",
    "qt": "Qt",
    "rails": "Ruby on Rails",
    "sinatra": "Sinatra",
    "flutter": "Flutter",
    "react-native": "React Native",
    "svelte": "Svelte",
    "@sveltejs/kit": "SvelteKit",
    "astro": "Astro",
    "@remix-run/react": "Remix",
    "solid-js": "SolidJS",
    "android": "Android (Native)",
    "ios": "iOS (Native)"
}

# Scoring rules for architecture layers
ARCHITECTURE_RULES = {
    "backend": {
        "folders": ["backend", "server", "app"],
        "files": ["manage.py", "app.py", "main.py", "server.py", "server.js", "app.js", "main.go", "main.rs", "wsgi.py", "asgi.py"],
        "file_patterns": [],
        "frameworks": ["Django", "Flask", "FastAPI", "Express", "NestJS", "Spring Boot", "ASP.NET Core", "Laravel", "Symfony", "Gin", "Fiber", "Echo", "Actix", "Rocket", "Axum", "Ruby on Rails", "Sinatra"],
        "imports": ["fastapi", "flask", "django", "http.server", "express", "spring", "aspnet", "laravel", "symfony", "gin", "gofiber", "actix"],
        "points": {
            "folders": 2,
            "files": 3,
            "frameworks": 3,
            "imports": 3,
            "file_patterns": 2
        },
        "threshold": 3
    },
    "frontend": {
        "folders": ["frontend", "client", "public", "components", "pages", "src/components", "src/pages"],
        "files": ["webpack.config.js", "webpack.config.ts", "vite.config.ts", "vite.config.js", "tailwind.config.js", "index.html"],
        "file_patterns": ["*.svelte", "*.astro"],
        "frameworks": ["React", "Vue", "Angular", "Next.js", "Nuxt", "Electron", "Svelte", "SvelteKit", "Astro", "Remix", "SolidJS"],
        "imports": ["react", "vue", "@angular", "svelte", "solid-js"],
        "points": {
            "folders": 2,
            "files": 2,
            "frameworks": 3,
            "imports": 3,
            "file_patterns": 2
        },
        "threshold": 3
    },
    "mobile": {
        "folders": ["android", "ios", "lib", "flutter", "react-native", "native", "app/src/main"],
        "files": ["pubspec.yaml", "AndroidManifest.xml", "Info.plist", "Podfile", "main.dart", "MainActivity.kt", "MainActivity.java", "AppDelegate.swift", "SceneDelegate.swift"],
        "file_patterns": ["*.swift", "*.dart", "*.kt", "*.xcworkspace", "*.xcodeproj"],
        "frameworks": ["Flutter", "React Native", "Android (Native)", "iOS (Native)"],
        "imports": ["flutter", "react-native", "uikit", "swiftui", "android.app", "androidx.appcompat"],
        "points": {
            "folders": 2,
            "files": 3,
            "frameworks": 3,
            "imports": 3,
            "file_patterns": 2
        },
        "threshold": 3
    },
    "database": {
        "folders": ["database", "db", "migrations", "prisma"],
        "files": ["schema.sql", "init.sql", "migration.sql", "prisma.schema", "db.sqlite3", "schema.prisma"],
        "file_patterns": [],
        "frameworks": [],
        "imports": ["sqlalchemy", "peewee", "django.db", "pymongo", "sqlite3", "redis", "prisma", "mongoose", "pg", "mysql", "mysql2", "hibernate"],
        "points": {
            "folders": 2,
            "files": 3,
            "frameworks": 3,
            "imports": 3,
            "file_patterns": 2
        },
        "threshold": 3
    },
    "api": {
        "folders": ["api", "routes", "controllers"],
        "files": [],
        "file_patterns": ["*api.py", "*api.js", "*api.ts", "*routes.js", "*routes.ts", "*router.py", "*router.js", "*router.ts"],
        "frameworks": [],
        "imports": ["apirouter", "rest_framework", "graphql", "swagger", "openapi", "apollo"],
        "points": {
            "folders": 2,
            "files": 3,
            "frameworks": 3,
            "imports": 2,
            "file_patterns": 3
        },
        "threshold": 3
    },
    "ai": {
        "folders": ["rag", "agent", "ai", "model", "embeddings"],
        "files": [],
        "file_patterns": [],
        "frameworks": [],
        "imports": ["openai", "langchain", "llama_index", "sentence_transformers", "faiss", "ollama", "transformers", "torch", "tensorflow", "numpy", "pandas"],
        "points": {
            "folders": 2,
            "files": 3,
            "frameworks": 3,
            "imports": 3,
            "file_patterns": 2
        },
        "threshold": 3
    },
    "testing": {
        "folders": ["tests", "test", "spec"],
        "files": [],
        "file_patterns": ["*test_*", "*_test*", "*.test.*", "*.spec.*"],
        "frameworks": [],
        "imports": ["unittest", "pytest", "jest", "mocha", "chai", "vitest", "junit", "nunit", "phpunit"],
        "points": {
            "folders": 2,
            "files": 3,
            "frameworks": 3,
            "imports": 3,
            "file_patterns": 3
        },
        "threshold": 3
    },
    "docker": {
        "folders": [],
        "files": ["dockerfile", "docker-compose.yml", "docker-compose.yaml"],
        "file_patterns": [],
        "frameworks": [],
        "imports": [],
        "points": {
            "folders": 2,
            "files": 3,
            "frameworks": 3,
            "imports": 3,
            "file_patterns": 2
        },
        "threshold": 3
    },
    "github_actions": {
        "folders": [".github/workflows"],
        "files": [".gitlab-ci.yml", "azure-pipelines.yml"],
        "file_patterns": [],
        "frameworks": [],
        "imports": [],
        "points": {
            "folders": 3,
            "files": 3,
            "frameworks": 3,
            "imports": 3,
            "file_patterns": 2
        },
        "threshold": 3
    },
    "ci_cd": {
        "folders": [".github/workflows"],
        "files": [".gitlab-ci.yml", "azure-pipelines.yml"],
        "file_patterns": ["*k8s*", "*kubernetes*", "*helm*", "*deployment.yaml", "*deployment.yml"],
        "frameworks": [],
        "imports": [],
        "points": {
            "folders": 3,
            "files": 3,
            "frameworks": 3,
            "imports": 3,
            "file_patterns": 3
        },
        "threshold": 3
    },
    "documentation": {
        "folders": ["docs", "documentation"],
        "files": ["readme.md", "changelog.md", "contributing.md"],
        "file_patterns": [],
        "frameworks": [],
        "imports": [],
        "points": {
            "folders": 3,
            "files": 3,
            "frameworks": 3,
            "imports": 3,
            "file_patterns": 2
        },
        "threshold": 3
    }
}
