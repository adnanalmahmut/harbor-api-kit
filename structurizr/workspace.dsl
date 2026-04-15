workspace "saas-core-platform-api" "Production-oriented NestJS API starter / reference architecture" {
    !identifiers hierarchical

    model {
        developer = person "Developer" "Builds, runs, tests, and maintains the project."
        endUser = person "End User" "Uses the frontend and consumes features exposed by the API."

        frontend = softwareSystem "Frontend App" "Web or SPA frontend that consumes the API." {
            web = container "Web App" "UI for auth, users, files, and admin flows." "Next.js / SPA"
        }

        objectStorage = softwareSystem "Object Storage" "S3, GCS, or local storage driver."
        emailProvider = softwareSystem "Email Provider" "Resend or any outbound email provider."

        corePlatform = softwareSystem "saas-core-platform-api" "NestJS API with auth, RBAC, files, notifications, i18n, and security concerns." {
            api = container "API" "Main backend application." "NestJS 11 + Fastify" {
                core = component "Core" "Shared config, request context, validation, docs, exception handling, logging, i18n, security primitives, Prisma/Redis integration." "NestJS shared core"
                auth = component "Auth Module" "Authentication, sessions, OAuth, account flows, current user/session handling." "NestJS module"
                users = component "Users Module" "User CRUD, profile management, user-role/permission assignment." "NestJS module"
                rbac = component "RBAC Module" "Roles, permissions, grants, effective permission resolution and caching." "NestJS module"
                files = component "Files Module" "Upload, metadata, visibility, local/public stream access, storage-driver integration." "NestJS module"
                notify = component "Notify Module" "Async email queueing and provider integration." "NestJS module"
                health = component "Health Module" "Health checks for database and Redis." "NestJS module"
            }

            db = container "PostgreSQL" "Application data: users, sessions, RBAC, files, etc." "PostgreSQL" {
                tags "Database"
            }

            redis = container "Redis / BullMQ" "Caching, rate limiting, session-related data, and async jobs." "Redis + BullMQ"
        }

        endUser -> frontend.web "Uses"
        developer -> frontend.web "Tests flows through"

        frontend.web -> corePlatform.api "Calls HTTP/JSON API" "HTTPS"
        frontend.web -> corePlatform.api.auth "Calls auth endpoints" "HTTPS/JSON"
        frontend.web -> corePlatform.api.files "Calls file endpoints" "HTTPS/JSON"

        developer -> corePlatform.api "Runs locally, tests, debugs, and reviews" "HTTP/CLI"

        corePlatform.api -> corePlatform.db "Reads/writes application data" "Prisma"
        corePlatform.api -> corePlatform.redis "Uses cache, queue, and rate-limit/session helpers" "Redis protocol"
        corePlatform.api -> objectStorage "Uploads, streams, or generates storage URLs" "S3/GCS/Local driver"
        corePlatform.api -> emailProvider "Sends emails via queue/provider adapter" "HTTPS"

        corePlatform.api.auth -> corePlatform.api.core "Uses shared config, validation, logging, i18n, and session helpers"
        corePlatform.api.auth -> corePlatform.api.users "Reads/resolves user state"
        corePlatform.api.auth -> corePlatform.api.rbac "Uses roles/permissions when needed"
        corePlatform.api.auth -> corePlatform.api.notify "Triggers verification/reset email flows"

        corePlatform.api.users -> corePlatform.api.core "Uses shared infrastructure/services"
        corePlatform.api.users -> corePlatform.api.rbac "Assigns roles and permission-related data"

        corePlatform.api.rbac -> corePlatform.api.core "Uses shared infrastructure/services"

        corePlatform.api.files -> corePlatform.api.core "Uses shared infrastructure/services"
        corePlatform.api.files -> corePlatform.api.rbac "Checks permissions for private file access"
        corePlatform.api.files -> objectStorage "Stores, streams, or generates file URLs"

        corePlatform.api.notify -> corePlatform.api.core "Uses shared infrastructure/services"
        corePlatform.api.notify -> corePlatform.redis "Queues email jobs"
        corePlatform.api.notify -> emailProvider "Delivers emails"

        corePlatform.api.health -> corePlatform.api.core "Uses shared DB/Redis health dependencies"

        corePlatform.api.core -> corePlatform.db "Uses Prisma-backed services/repositories"
        corePlatform.api.core -> corePlatform.redis "Uses cache, rate-limit, and queue services"
    }

    views {
        systemContext corePlatform "SystemContext" {
            include *
            autoLayout lr
            title "System Context - saas-core-platform-api"
        }

        container corePlatform "Containers" {
            include *
            autoLayout lr
            title "Container View - saas-core-platform-api"
        }

        component corePlatform.api "API_Modules" {
            include *
            autoLayout lr
            title "Component View - API Modules"
        }

        dynamic corePlatform.api "Login_Flow" {
            title "Dynamic View - Login / Session Flow"

            endUser -> frontend.web "1. Submit credentials or complete OAuth callback"
            frontend.web -> corePlatform.api.auth "2. POST /api/v1/auth/login or auth callback"
            corePlatform.api.auth -> corePlatform.api.users "3. Resolve account and user"
            corePlatform.api.auth -> corePlatform.api.rbac "4. Resolve roles and permissions when needed"
            corePlatform.api.auth -> corePlatform.api.core "5. Use validation, config, i18n, logging, and session helpers"
            corePlatform.api.core -> corePlatform.db "6. Persist or read user and session state"
            corePlatform.api.core -> corePlatform.redis "7. Cache/session/rate-limit side effects"
            corePlatform.api.auth -> corePlatform.api.notify "8. Trigger verification/reset notification when needed"
            corePlatform.api.notify -> corePlatform.redis "9. Enqueue async email job"
            corePlatform.api.notify -> emailProvider "10. Send email"

            autoLayout lr
        }

        dynamic corePlatform.api "File_Flow" {
            title "Dynamic View - File Upload / Access Flow"

            endUser -> frontend.web "1. Upload, download, or public file request"
            frontend.web -> corePlatform.api.files "2. Call /api/v1/files or /api/v1/public/files"
            corePlatform.api.files -> corePlatform.api.rbac "3. Check permissions for private access"
            corePlatform.api.files -> corePlatform.api.core "4. Use validation, logging, config, and shared services"
            corePlatform.api.core -> corePlatform.db "5. Persist or read file metadata"
            corePlatform.api.files -> objectStorage "6. Upload, stream, or generate storage URL"

            autoLayout lr
        }

        styles {
            element "Element" {
                background #1f2937
                color #f9fafb
                shape RoundedBox
            }

            element "Person" {
                background #0f766e
                color #ffffff
                shape Person
            }

            element "Database" {
                background #7c3aed
                color #ffffff
                shape Cylinder
            }

            relationship "Relationship" {
                color #94a3b8
                thickness 2
            }
        }
    }
}