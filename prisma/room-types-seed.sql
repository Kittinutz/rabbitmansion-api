-- Room Types Migration
-- Creating the specific room types requested

INSERT INTO "RoomType" (id, code, name, description, "basePrice", capacity, "bedType", "hasPoolView", amenities, "isActive", "createdAt", "updatedAt") VALUES

-- Deluxe Double Room with Pool View
('rm_type_1', 'DELUXE_DOUBLE_POOL_VIEW', 
 '{"en": "Deluxe Double Room with Pool View", "th": "ห้องดีลักซ์ดับเบิลวิวสระ"}',
 '{"en": "Spacious double room with beautiful pool view", "th": "ห้องดับเบิลกว้างขวางพร้อมวิวสระว่ายน้ำสวยงาม"}',
 2500.00, 2, 'Double', true, 
 ARRAY['wifi', 'air_conditioning', 'minibar', 'balcony', 'pool_view'], 
 true, NOW(), NOW()),

-- Deluxe Double Room with balcony
('rm_type_2', 'DELUXE_DOUBLE_BALCONY', 
 '{"en": "Deluxe Double Room with balcony", "th": "ห้องดีลักซ์ดับเบิลพร้อมระเบียง"}',
 '{"en": "Comfortable double room with private balcony", "th": "ห้องดับเบิลสะดวกสบายพร้อมระเบียงส่วนตัว"}',
 2200.00, 2, 'Double', false, 
 ARRAY['wifi', 'air_conditioning', 'minibar', 'balcony'], 
 true, NOW(), NOW()),

-- Deluxe Twin Room with balcony
('rm_type_3', 'DELUXE_TWIN_BALCONY', 
 '{"en": "Deluxe Twin Room with balcony", "th": "ห้องดีลักซ์ทวินพร้อมระเบียง"}',
 '{"en": "Twin bed room with private balcony", "th": "ห้องเตียงแฝดพร้อมระเบียงส่วนตัว"}',
 2100.00, 2, 'Twin', false, 
 ARRAY['wifi', 'air_conditioning', 'minibar', 'balcony'], 
 true, NOW(), NOW()),

-- Family Double Room with balcony (1 bathroom)
('rm_type_4', 'FAMILY_DOUBLE_BALCONY', 
 '{"en": "Family Double Room with balcony (1 bathroom)", "th": "ห้องแฟมิลี่ดับเบิลพร้อมระเบียง (ห้องน้ำ 1 ห้อง)"}',
 '{"en": "Spacious family room with double bed and balcony", "th": "ห้องแฟมิลี่กว้างขวางพร้อมเตียงดับเบิลและระเบียง"}',
 2800.00, 4, 'Family', false, 
 ARRAY['wifi', 'air_conditioning', 'minibar', 'balcony', 'family_friendly'], 
 true, NOW(), NOW()),

-- Premier Double Room with balcony
('rm_type_5', 'PREMIER_DOUBLE_BALCONY', 
 '{"en": "Premier Double Room with balcony", "th": "ห้องพรีเมียร์ดับเบิลพร้อมระเบียง"}',
 '{"en": "Premium double room with luxurious balcony", "th": "ห้องดับเบิลพรีเมียมพร้อมระเบียงหรูหรา"}',
 3000.00, 2, 'Double', false, 
 ARRAY['wifi', 'air_conditioning', 'minibar', 'balcony', 'premium_amenities'], 
 true, NOW(), NOW()),

-- Super Deluxe Room with Pool view
('rm_type_6', 'SUPER_DELUXE_POOL_VIEW', 
 '{"en": "Super Deluxe Room with Pool view", "th": "ห้องซุปเปอร์ดีลักซ์วิวสระ"}',
 '{"en": "Luxurious room with spectacular pool view", "th": "ห้องหรูหราพร้อมวิวสระว่ายน้ำสวยงาม"}',
 3200.00, 2, 'Double', true, 
 ARRAY['wifi', 'air_conditioning', 'minibar', 'balcony', 'pool_view', 'premium_amenities'], 
 true, NOW(), NOW()),

-- Super Premier Room with Terrace
('rm_type_7', 'SUPER_PREMIER_TERRACE', 
 '{"en": "Super Premier Room with Terrace", "th": "ห้องซุปเปอร์พรีเมียร์พร้อมเทอร์เรส"}',
 '{"en": "Ultimate luxury room with private terrace", "th": "ห้องหรูหราสุดพร้อมเทอร์เรสส่วนตัว"}',
 3800.00, 2, 'Double', false, 
 ARRAY['wifi', 'air_conditioning', 'minibar', 'terrace', 'premium_amenities', 'luxury_suite'], 
 true, NOW(), NOW()),

-- Deluxe Twin Room (No window)
('rm_type_8', 'DELUXE_TWIN_NO_WINDOW', 
 '{"en": "Deluxe Twin Room (No window)", "th": "ห้องดีลักซ์ทวิน (ไม่มีหน้าต่าง)"}',
 '{"en": "Comfortable twin room without window", "th": "ห้องทวินสะดวกสบายไม่มีหน้าต่าง"}',
 1800.00, 2, 'Twin', false, 
 ARRAY['wifi', 'air_conditioning', 'minibar'], 
 true, NOW(), NOW()),

-- Deluxe Double Room with balcony (No window)
('rm_type_9', 'DELUXE_DOUBLE_BALCONY_NO_WINDOW', 
 '{"en": "Deluxe Double Room with balcony (No window)", "th": "ห้องดีลักซ์ดับเบิลพร้อมระเบียง (ไม่มีหน้าต่าง)"}',
 '{"en": "Double room with balcony access but no window", "th": "ห้องดับเบิลพร้อมระเบียงแต่ไม่มีหน้าต่าง"}',
 2000.00, 2, 'Double', false, 
 ARRAY['wifi', 'air_conditioning', 'minibar', 'balcony'], 
 true, NOW(), NOW());