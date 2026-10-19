-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role` VARCHAR(50) NOT NULL DEFAULT 'User',
    `account_status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `username` VARCHAR(100) NULL,
    `surname` VARCHAR(100) NULL,
    `first_name` VARCHAR(100) NULL,
    `middle_initial` VARCHAR(2) NULL,
    `phone_number` VARCHAR(20) NULL,
    `email` VARCHAR(150) NOT NULL,
    `email_verified_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `password` VARCHAR(255) NOT NULL,
    `failed_attempts` INTEGER NULL DEFAULT 0,
    `lockout_time` DATETIME(3) NULL,
    `reset_token` VARCHAR(255) NULL,
    `reset_expires` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `google_identities` (
    `google_subject` VARCHAR(255) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `google_identities_user_id_key`(`user_id`),
    PRIMARY KEY (`google_subject`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `revoked_sessions` (
    `session_id` VARCHAR(64) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,

    INDEX `revoked_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NULL,
    `phone` VARCHAR(50) NOT NULL,
    `address` TEXT NULL,
    `photo_path` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `loyalty_stamps` INTEGER NOT NULL DEFAULT 0,
    `reward_available` BOOLEAN NOT NULL DEFAULT false,
    `reward_redeemed_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_conversations` (
    `conversation_id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_user_id` INTEGER NOT NULL,
    `customer_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `support_conversations_customer_user_id_key`(`customer_user_id`),
    INDEX `support_conversations_updated_at_idx`(`updated_at`),
    PRIMARY KEY (`conversation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_messages` (
    `message_id` BIGINT NOT NULL AUTO_INCREMENT,
    `conversation_id` INTEGER NOT NULL,
    `sender_id` INTEGER NOT NULL,
    `sender_role` VARCHAR(50) NOT NULL,
    `content` TEXT NOT NULL,
    `request_key` VARCHAR(32) NOT NULL,
    `created_at` DATETIME(3) NOT NULL,
    `read_at` DATETIME(3) NULL,

    INDEX `support_messages_conversation_id_message_id_idx`(`conversation_id`, `message_id`),
    INDEX `support_messages_conversation_id_sender_role_read_at_idx`(`conversation_id`, `sender_role`, `read_at`),
    INDEX `support_messages_sender_id_created_at_idx`(`sender_id`, `created_at`),
    UNIQUE INDEX `support_messages_sender_id_request_key_key`(`sender_id`, `request_key`),
    PRIMARY KEY (`message_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `pet_name` VARCHAR(100) NOT NULL,
    `breed` VARCHAR(100) NULL,
    `age_dob` VARCHAR(100) NULL,
    `gender` VARCHAR(10) NULL,
    `species` VARCHAR(50) NULL,
    `photo_path` LONGTEXT NULL,
    `is_active` TINYINT NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `product_id` INTEGER NOT NULL AUTO_INCREMENT,
    `sku` VARCHAR(40) NULL,
    `product_name` VARCHAR(150) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `product_group` VARCHAR(191) NOT NULL DEFAULT 'Other',
    `price` DECIMAL(10, 2) NOT NULL,
    `stock_quantity` INTEGER NOT NULL DEFAULT 0,
    `reorder_level` INTEGER NOT NULL DEFAULT 5,
    `is_active` TINYINT NOT NULL DEFAULT 1,
    `description` TEXT NULL,
    `image` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `products_sku_key`(`sku`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grooming_styles` (
    `style_id` INTEGER NOT NULL AUTO_INCREMENT,
    `style_name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`style_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `style_size_pricing` (
    `pricing_id` INTEGER NOT NULL AUTO_INCREMENT,
    `style_id` INTEGER NOT NULL,
    `pet_size` VARCHAR(50) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`pricing_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grooming_addons` (
    `addon_id` INTEGER NOT NULL AUTO_INCREMENT,
    `addon_name` VARCHAR(100) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`addon_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `groomers` (
    `groomer_id` INTEGER NOT NULL AUTO_INCREMENT,
    `groomer_name` VARCHAR(100) NOT NULL,
    `is_active` TINYINT NOT NULL DEFAULT 1,
    `contact_number` VARCHAR(20) NULL,
    `profile_image` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `groomers_groomer_name_key`(`groomer_name`),
    PRIMARY KEY (`groomer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `groomer_availability` (
    `availability_id` INTEGER NOT NULL AUTO_INCREMENT,
    `groomer_id` INTEGER NOT NULL,
    `day_of_week` INTEGER NOT NULL,
    `start_time` TIME(0) NOT NULL,
    `end_time` TIME(0) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `groomer_availability_day_of_week_is_active_idx`(`day_of_week`, `is_active`),
    UNIQUE INDEX `groomer_availability_groomer_id_day_of_week_key`(`groomer_id`, `day_of_week`),
    PRIMARY KEY (`availability_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grooming_appointments` (
    `appointment_id` BIGINT NOT NULL AUTO_INCREMENT,
    `reservation_code` VARCHAR(24) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `pet_id` INTEGER NOT NULL,
    `grooming_style_id` INTEGER NOT NULL,
    `groomer_id` INTEGER NOT NULL,
    `booking_type` VARCHAR(191) NOT NULL DEFAULT 'Salon',
    `contact_name` VARCHAR(150) NULL,
    `contact_number` VARCHAR(20) NULL,
    `service_address` TEXT NULL,
    `pet_size` VARCHAR(50) NOT NULL,
    `appointment_date` DATE NOT NULL,
    `appointment_time` TIME(0) NOT NULL,
    `special_instructions` TEXT NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `cancelled_at` DATETIME(3) NULL,
    `confirmation_email_sent_at` DATETIME(3) NULL,
    `reminder_email_sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `grooming_appointments_reservation_code_key`(`reservation_code`),
    INDEX `grooming_appointments_appointment_date_status_idx`(`appointment_date`, `status`),
    INDEX `grooming_appointments_groomer_id_appointment_date_appointmen_idx`(`groomer_id`, `appointment_date`, `appointment_time`),
    PRIMARY KEY (`appointment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grooming_reviews` (
    `review_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `appointment_id` BIGINT NULL,
    `product_reservation_id` BIGINT NULL,
    `rating` TINYINT NOT NULL,
    `title` VARCHAR(100) NOT NULL DEFAULT '',
    `message` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
    `moderation_reason` VARCHAR(500) NULL,
    `moderated_by` INTEGER NULL,
    `moderated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,

    UNIQUE INDEX `grooming_reviews_appointment_id_key`(`appointment_id`),
    UNIQUE INDEX `grooming_reviews_product_reservation_id_key`(`product_reservation_id`),
    INDEX `reviews_public_idx`(`status`, `created_at`),
    INDEX `reviews_owner_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`review_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grooming_attendance` (
    `appointment_id` BIGINT NOT NULL,
    `checked_in_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NULL,
    `cancellation_reason` TEXT NULL,
    `cancellation_kind` VARCHAR(20) NULL,
    `cancelled_at` DATETIME(3) NULL,

    PRIMARY KEY (`appointment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_loyalty_program` (
    `customer_id` INTEGER NOT NULL,
    `completed_visits` INTEGER NOT NULL DEFAULT 0,
    `vip_member` BOOLEAN NOT NULL DEFAULT false,
    `vip_since` DATETIME(3) NULL,

    PRIMARY KEY (`customer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointment_loyalty_pricing` (
    `appointment_id` BIGINT NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `estimated_percent` INTEGER NOT NULL DEFAULT 0,
    `discount_percent` INTEGER NOT NULL DEFAULT 0,
    `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `visit_number` INTEGER NULL,
    `applied_at` DATETIME(3) NULL,

    PRIMARY KEY (`appointment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `appointment_addons` (
    `appointment_id` BIGINT NOT NULL,
    `addon_id` INTEGER NOT NULL,
    `price_at_booking` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`appointment_id`, `addon_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_reservations` (
    `reservation_id` BIGINT NOT NULL AUTO_INCREMENT,
    `reservation_code` VARCHAR(24) NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `customer_name` VARCHAR(150) NULL,
    `contact_number` VARCHAR(20) NULL,
    `delivery_address` TEXT NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `reserved_until` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `product_reservations_reservation_code_key`(`reservation_code`),
    INDEX `product_reservations_created_at_status_idx`(`created_at`, `status`),
    PRIMARY KEY (`reservation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_reservation_checkout` (
    `reservation_id` BIGINT NOT NULL,
    `customer_id` INTEGER NOT NULL,
    `request_key` VARCHAR(32) NOT NULL,
    `request_fingerprint` VARCHAR(64) NOT NULL,
    `payment_method` VARCHAR(10) NOT NULL,

    UNIQUE INDEX `checkout_customer_request`(`customer_id`, `request_key`),
    PRIMARY KEY (`reservation_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_reservation_items` (
    `reservation_item_id` BIGINT NOT NULL AUTO_INCREMENT,
    `reservation_id` BIGINT NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`reservation_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `notification_id` BIGINT NOT NULL AUTO_INCREMENT,
    `recipient_id` INTEGER NOT NULL,
    `event_key` VARCHAR(120) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `related_type` VARCHAR(50) NULL,
    `related_id` VARCHAR(50) NULL,
    `link` VARCHAR(255) NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_recipient_id_is_read_created_at_idx`(`recipient_id`, `is_read`, `created_at`),
    UNIQUE INDEX `notifications_recipient_id_event_key_key`(`recipient_id`, `event_key`),
    PRIMARY KEY (`notification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `audit_log_id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `user_name` VARCHAR(150) NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `action` VARCHAR(80) NOT NULL,
    `module` VARCHAR(80) NOT NULL,
    `record_id` VARCHAR(80) NULL,
    `description` TEXT NOT NULL,
    `ip_address` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_created_at_idx`(`created_at`),
    INDEX `audit_logs_user_id_action_module_idx`(`user_id`, `action`, `module`),
    PRIMARY KEY (`audit_log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyalty_transactions` (
    `transaction_id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER NOT NULL,
    `changed_by_id` INTEGER NOT NULL,
    `change_amount` INTEGER NOT NULL,
    `balance_after` INTEGER NOT NULL,
    `reason` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `loyalty_transactions_customer_id_created_at_idx`(`customer_id`, `created_at`),
    PRIMARY KEY (`transaction_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_settings` (
    `key` VARCHAR(80) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `google_identities` ADD CONSTRAINT `google_identities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_conversations` ADD CONSTRAINT `support_conversations_customer_user_id_fkey` FOREIGN KEY (`customer_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_conversations` ADD CONSTRAINT `support_conversations_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `support_conversations`(`conversation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_messages` ADD CONSTRAINT `support_messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pets` ADD CONSTRAINT `pets_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `style_size_pricing` ADD CONSTRAINT `style_size_pricing_style_id_fkey` FOREIGN KEY (`style_id`) REFERENCES `grooming_styles`(`style_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groomer_availability` ADD CONSTRAINT `groomer_availability_groomer_id_fkey` FOREIGN KEY (`groomer_id`) REFERENCES `groomers`(`groomer_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grooming_appointments` ADD CONSTRAINT `grooming_appointments_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grooming_appointments` ADD CONSTRAINT `grooming_appointments_pet_id_fkey` FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grooming_appointments` ADD CONSTRAINT `grooming_appointments_grooming_style_id_fkey` FOREIGN KEY (`grooming_style_id`) REFERENCES `grooming_styles`(`style_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grooming_appointments` ADD CONSTRAINT `grooming_appointments_groomer_id_fkey` FOREIGN KEY (`groomer_id`) REFERENCES `groomers`(`groomer_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grooming_reviews` ADD CONSTRAINT `grooming_reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grooming_reviews` ADD CONSTRAINT `grooming_reviews_moderated_by_fkey` FOREIGN KEY (`moderated_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grooming_reviews` ADD CONSTRAINT `grooming_reviews_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grooming_reviews` ADD CONSTRAINT `grooming_reviews_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `grooming_appointments`(`appointment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grooming_reviews` ADD CONSTRAINT `grooming_reviews_product_reservation_id_fkey` FOREIGN KEY (`product_reservation_id`) REFERENCES `product_reservations`(`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `grooming_attendance` ADD CONSTRAINT `grooming_attendance_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `grooming_appointments`(`appointment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_loyalty_program` ADD CONSTRAINT `customer_loyalty_program_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_loyalty_pricing` ADD CONSTRAINT `appointment_loyalty_pricing_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `grooming_appointments`(`appointment_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_addons` ADD CONSTRAINT `appointment_addons_appointment_id_fkey` FOREIGN KEY (`appointment_id`) REFERENCES `grooming_appointments`(`appointment_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `appointment_addons` ADD CONSTRAINT `appointment_addons_addon_id_fkey` FOREIGN KEY (`addon_id`) REFERENCES `grooming_addons`(`addon_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reservations` ADD CONSTRAINT `product_reservations_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reservation_checkout` ADD CONSTRAINT `product_reservation_checkout_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `product_reservations`(`reservation_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reservation_checkout` ADD CONSTRAINT `product_reservation_checkout_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reservation_items` ADD CONSTRAINT `product_reservation_items_reservation_id_fkey` FOREIGN KEY (`reservation_id`) REFERENCES `product_reservations`(`reservation_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reservation_items` ADD CONSTRAINT `product_reservation_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_id_fkey` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_changed_by_id_fkey` FOREIGN KEY (`changed_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
