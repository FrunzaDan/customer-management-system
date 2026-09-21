-- Seeds the fixed catalogue of 50 tech products into tbl_products.
--
-- Idempotent: a row is only inserted when its GUID isn't already there, so re-running a
-- deployment never duplicates products and never resets stock_quantity back to its seed
-- value once purchases have started decrementing it. inventory_quantity (units originally
-- stocked) starts equal to stock_quantity. The GUIDs are hard-coded (not NEWID()) precisely
-- so that "already there" can be recognised on every later deploy.
INSERT INTO dbo.tbl_products (
    PK_product_guid,
    product_name,
    category,
    comment,
    price,
    inventory_quantity,
    stock_quantity,
    depot
)
SELECT
    v.PK_product_guid,
    v.product_name,
    v.category,
    v.comment,
    v.price,
    v.inventory_quantity,
    v.stock_quantity,
    v.depot
FROM (VALUES
        (N'2432276c-4ef0-4e50-abc5-8b5f82297844', N'Aerobook 14 Pro', N'Laptop', N'14-inch ultraportable, 16 GB RAM, 512 GB SSD, all-day battery.', 1299.00, 25, 25, N'Central Depot'),
        (N'411caad2-d944-4909-bdca-cc625fc9104e', N'Aerobook 16 Studio', N'Laptop', N'16-inch creator laptop with a dedicated GPU and a colour-accurate display.', 2199.00, 12, 12, N'Central Depot'),
        (N'702ca3f3-da06-4dae-896f-0e908a562051', N'Nexora Slate 13', N'Laptop', N'Thin and light 13-inch laptop for everyday work and study.', 799.00, 40, 40, N'North Depot'),
        (N'bab971e4-3b75-4ec3-9a2e-2538b004fbf2', N'Voltix Forge 15', N'Laptop', N'15-inch gaming laptop, 165 Hz screen, 1 TB SSD.', 1799.00, 9, 9, N'South Depot'),
        (N'81c0d5e8-312f-4fe8-bdd5-0812785b5728', N'Zentro Office 15', N'Laptop', N'Budget 15-inch laptop with a full-size keyboard and numpad.', 549.00, 60, 60, N'East Depot'),
        (N'd657ef04-142a-4620-952d-1073b2394a32', N'Kaleo Convertible 14', N'Laptop', N'14-inch 2-in-1 with a touchscreen and stylus support.', 999.00, 18, 18, N'West Depot'),
        (N'6fe98019-a635-4d91-9c67-0820516489b1', N'Lumina 24 FHD', N'Monitor', N'24-inch 1080p IPS office monitor with slim bezels.', 149.00, 80, 80, N'Central Depot'),
        (N'a491c587-a269-4d86-8915-268fed8645b1', N'Lumina 27 QHD', N'Monitor', N'27-inch 1440p IPS monitor, 75 Hz, USB-C input.', 289.00, 45, 45, N'North Depot'),
        (N'3120c3e5-d57e-4afb-a745-61193fef44de', N'Lumina 32 4K', N'Monitor', N'32-inch 4K monitor, factory calibrated, height-adjustable stand.', 549.00, 20, 20, N'South Depot'),
        (N'141460cc-c94a-4e2c-8d82-20f98ff6c1d0', N'Voltix Edge 34 Ultrawide', N'Monitor', N'34-inch curved ultrawide, 144 Hz, built for multitasking.', 449.00, 15, 15, N'East Depot'),
        (N'027d83a6-419f-486a-8bc5-196a3683e392', N'Pixelo Portable 15', N'Monitor', N'15.6-inch portable USB-C monitor with a folding cover stand.', 199.00, 30, 30, N'West Depot'),
        (N'9ccaac54-d761-40af-b7cf-984a2d4f558c', N'Orbis One 5G', N'Phone', N'6.1-inch flagship phone, 256 GB, dual camera.', 999.00, 35, 35, N'Central Depot'),
        (N'e5578669-cc87-43bb-99cf-837bee0f0f0a', N'Orbis One Mini', N'Phone', N'Compact 5.4-inch phone with a flagship chip.', 749.00, 28, 28, N'North Depot'),
        (N'bdd528af-906a-49eb-80b8-bacb9370ae82', N'Nexora Note 6', N'Phone', N'6.7-inch large-screen phone with a 5000 mAh battery.', 649.00, 50, 50, N'South Depot'),
        (N'2a84216b-6045-485a-b192-a1f7b069146e', N'Zentro Lite 4G', N'Phone', N'Affordable 6.5-inch phone, 128 GB, two-day battery.', 199.00, 90, 90, N'East Depot'),
        (N'2199a8a2-94cb-4f71-9d87-06a19457d0b7', N'Kaleo Fold', N'Phone', N'Foldable 7.6-inch inner display, 512 GB.', 1799.00, 6, 6, N'West Depot'),
        (N'd3b250aa-8617-4722-aae4-77dc79b6bc3f', N'Pixelo Snap 5G', N'Phone', N'Camera-first 6.3-inch phone with a 50 MP main sensor.', 599.00, 42, 42, N'Central Depot'),
        (N'9f0633e1-7808-4260-9129-3e679044d740', N'Orbis Tab 11', N'Tablet', N'11-inch tablet, 128 GB, stylus supported.', 499.00, 33, 33, N'North Depot'),
        (N'a34995eb-3091-48fe-83e3-1aac2ca91943', N'Orbis Tab Pro 13', N'Tablet', N'13-inch OLED tablet, 256 GB, keyboard dock available.', 1099.00, 14, 14, N'South Depot'),
        (N'65640a2f-f21f-4492-b22f-06917cd3dbc5', N'Zentro Kids Tab 8', N'Tablet', N'8-inch tablet with a rugged case and parental controls.', 129.00, 70, 70, N'East Depot'),
        (N'26bbcb58-209a-470e-9530-77d7776db379', N'Nexora Reader 10', N'Tablet', N'10-inch tablet with a paper-like display for reading.', 279.00, 22, 22, N'West Depot'),
        (N'0b38188d-a34a-4aeb-a6c2-82107c03afdd', N'Voltix K1 Mechanical', N'Keyboard', N'Full-size mechanical keyboard, tactile switches, RGB backlight.', 99.00, 55, 55, N'Central Depot'),
        (N'bd40983c-bb68-4500-b31a-2e089b484319', N'Voltix K3 TKL', N'Keyboard', N'Tenkeyless hot-swappable mechanical keyboard.', 129.00, 38, 38, N'North Depot'),
        (N'1586635b-9e15-4d44-bf19-9dfe6d7c2f24', N'Kaleo Silent Wireless', N'Keyboard', N'Low-profile wireless keyboard, quiet keys, 3-device pairing.', 69.00, 65, 65, N'South Depot'),
        (N'9385c1de-7a99-4a83-bdce-a0902faac33f', N'Zentro Compact 60', N'Keyboard', N'60 percent layout Bluetooth keyboard for travel.', 59.00, 48, 48, N'East Depot'),
        (N'1c914610-6297-4523-9a13-5aa25410c581', N'Nexora Glide Wireless', N'Mouse', N'Ergonomic wireless mouse, 4000 DPI, 12-month battery.', 34.00, 120, 120, N'West Depot'),
        (N'914f76b6-8349-42fd-a9d6-4db74ef0c1da', N'Voltix Viper Pro', N'Mouse', N'Lightweight wired gaming mouse, 26000 DPI sensor.', 79.00, 44, 44, N'Central Depot'),
        (N'edbacd92-06f9-433a-85f1-2d48e3636a2a', N'Kaleo Vertical Ergo', N'Mouse', N'Vertical mouse that keeps the wrist in a neutral position.', 49.00, 36, 36, N'North Depot'),
        (N'3db55605-717a-4a50-8857-674016c64e84', N'Zentro Travel Mini', N'Mouse', N'Compact Bluetooth mouse that fits in a laptop sleeve.', 19.00, 150, 150, N'South Depot'),
        (N'e0e1c1fd-57ab-4d53-9502-2b9bf2e5a46b', N'Lumina Desk Mat XL', N'Mousepad', N'900 x 400 mm stitched-edge desk mat, non-slip base.', 29.00, 75, 75, N'East Depot'),
        (N'97650a74-b55e-4752-bb62-a43240057516', N'Voltix Speed Pad', N'Mousepad', N'Low-friction cloth mousepad tuned for fast tracking.', 17.00, 110, 110, N'West Depot'),
        (N'd5b55d92-d8f8-4a3d-b644-1df72eef122d', N'Kaleo Wrist Rest Pad', N'Mousepad', N'Standard mousepad with an integrated gel wrist rest.', 14.00, 95, 95, N'Central Depot'),
        (N'21af8c83-1412-4f32-8341-28811331d3c8', N'Orbis Studio Over-Ear', N'Headset', N'Wireless over-ear headset with active noise cancelling.', 249.00, 27, 27, N'North Depot'),
        (N'21906a98-9e53-4c55-b2d6-306cd56d79b5', N'Voltix Command 7.1', N'Headset', N'Gaming headset with 7.1 surround and a detachable microphone.', 89.00, 52, 52, N'South Depot'),
        (N'a5c0b55a-7aad-4782-8f97-92c100e28b42', N'Zentro Call Duo', N'Headset', N'Lightweight USB headset tuned for video calls.', 59.00, 68, 68, N'East Depot'),
        (N'c8db5e83-948c-4a19-bb0d-7406c4584a17', N'Nexora Buds Sport', N'Headset', N'True wireless earbuds with a sweat-resistant charging case.', 79.00, 85, 85, N'West Depot'),
        (N'df6d1178-a7bf-4e7f-abae-c21b8b622c0a', N'Pixelo Cam 1080', N'Webcam', N'1080p webcam with autofocus and a privacy shutter.', 49.00, 60, 60, N'Central Depot'),
        (N'd7994c30-6266-4011-a93d-e659a9fdd5ee', N'Pixelo Cam 4K Pro', N'Webcam', N'4K webcam with HDR and a wide-angle lens.', 149.00, 24, 24, N'North Depot'),
        (N'4b61af3f-56d9-404d-bc89-78dec4c9d19f', N'Lumina Beam Speaker', N'Speaker', N'Portable Bluetooth speaker, 12 hours of playback.', 69.00, 58, 58, N'South Depot'),
        (N'16334122-b2ba-4054-8baa-579bd0dfa251', N'Lumina Desk Bar', N'Speaker', N'Compact USB soundbar for monitors and laptops.', 89.00, 31, 31, N'East Depot'),
        (N'77cc5ff1-229c-4093-8af0-9f3f676941fb', N'Orbis Watch S', N'Smartwatch', N'Fitness smartwatch with GPS and a week of battery life.', 229.00, 40, 40, N'West Depot'),
        (N'51b90389-0243-4d9b-b895-9d95fd4e3380', N'Kaleo Band 3', N'Smartwatch', N'Slim activity band with heart-rate and sleep tracking.', 59.00, 100, 100, N'Central Depot'),
        (N'14d3986c-a9de-4d1c-937c-d72eefcf8988', N'Zentro Pocket SSD 1TB', N'External SSD', N'1 TB pocket-sized USB-C SSD, up to 1000 MB/s.', 99.00, 72, 72, N'North Depot'),
        (N'38815a35-8d26-4600-82ac-3dd0b3f3f96e', N'Zentro Pocket SSD 2TB', N'External SSD', N'2 TB rugged USB-C SSD, water and dust resistant.', 179.00, 34, 34, N'South Depot'),
        (N'02c36530-ca61-4a56-957d-75a130cc9547', N'Voltix GaN 65W', N'Charger', N'Compact 65 W GaN wall charger with two USB-C ports.', 39.00, 130, 130, N'East Depot'),
        (N'3c8cbd7c-079b-4014-b71b-0fadb04c620c', N'Voltix Power Bank 20K', N'Charger', N'20000 mAh power bank with 45 W USB-C output.', 49.00, 88, 88, N'West Depot'),
        (N'c66f94aa-9498-4aa8-8727-f532cd084a69', N'Kaleo Dock 11-in-1', N'Docking Station', N'USB-C dock: dual HDMI, Ethernet, SD reader and 100 W pass-through.', 159.00, 26, 26, N'Central Depot'),
        (N'96229729-2bf5-4ad0-8114-868858a7f8d1', N'Nexora Mesh Router AX', N'Router', N'Wi-Fi 6 dual-band router covering up to 150 square metres.', 129.00, 37, 37, N'North Depot'),
        (N'd9f394be-6c48-45b3-a6a9-cd5ce16ac834', N'Zentro InkTank Printer', N'Printer', N'Wireless colour ink-tank printer with a low cost per page.', 219.00, 16, 16, N'South Depot'),
        (N'80171322-ad72-4b09-bc65-6aa22533cc73', N'Pixelo Podcast Mic', N'Microphone', N'USB condenser microphone with a pop filter and desk stand.', 89.00, 29, 29, N'East Depot')
) AS v (PK_product_guid, product_name, category, comment, price, inventory_quantity, stock_quantity, depot)
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.tbl_products p
    WHERE p.PK_product_guid = v.PK_product_guid
);
