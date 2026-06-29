-- aikit — seed catalog (automations + modules) from the original UI mock data.
-- Idempotent: upsert on slug.

insert into public.automations (slug, title, description, type, pricing, cost_per_run, image, sort_order) values
('ats-cv','ATS-Friendly CV Converter','Ubah CV lama berbasis teks menjadi format ATS-Friendly secara instan.','Automation','Free',0,'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=200&fit=crop&auto=format',1),
('invoice-gen','Invoice Generator','Generate invoice profesional dari data sederhana dalam hitungan detik.','Automation','Free',0,'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=200&fit=crop&auto=format',2),
('email-blast','Email Blast Personalizer','Personalisasi ratusan email marketing secara otomatis dengan AI.','Automation','Paid',150,'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=400&h=200&fit=crop&auto=format',3),
('social-caption','Social Media Caption AI','Generate caption Instagram, Twitter, dan LinkedIn dari brief singkat.','Automation','Free',0,'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=200&fit=crop&auto=format',4),
('pdf-summarizer','PDF Summarizer','Rangkum dokumen PDF panjang menjadi poin-poin penting dalam menit.','Automation','Paid',100,'https://images.unsplash.com/photo-1568667256549-094345857637?w=400&h=200&fit=crop&auto=format',5),
('data-cleaner','Data Cleaner & Formatter','Bersihkan dan format data spreadsheet kotor secara otomatis.','Automation','Paid',200,'https://images.unsplash.com/photo-1543286386-2e659306cd6c?w=400&h=200&fit=crop&auto=format',6)
on conflict (slug) do update set
  title=excluded.title, description=excluded.description, type=excluded.type,
  pricing=excluded.pricing, cost_per_run=excluded.cost_per_run, image=excluded.image, sort_order=excluded.sort_order;

insert into public.modules (slug, title, description, category, pricing, image, sort_order) values
('keuangan-pribadi','Manajer Keuangan Pribadi','Lacak pengeluaran, buat anggaran, dan analisis pola keuangan bulanan kamu secara otomatis.','Keuangan','Free','https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=400&h=200&fit=crop&auto=format',1),
('crm-lite','CRM Lite','Kelola kontak, pipeline penjualan, dan follow-up klien dalam satu tempat yang sederhana.','Bisnis','Pro','https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=400&h=200&fit=crop&auto=format',2),
('hr-attendance','HR Attendance Tracker','Catat kehadiran karyawan, kelola izin, dan generate laporan bulanan otomatis.','HR','Pro','https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=200&fit=crop&auto=format',3),
('content-planner','Content Planner','Rencanakan kalender konten, schedule posting, dan pantau performa konten kamu.','Marketing','Free','https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400&h=200&fit=crop&auto=format',4),
('inventory-manager','Inventory Manager','Pantau stok barang, kelola supplier, dan dapatkan notifikasi restock otomatis.','Operasional','Pro','https://images.unsplash.com/photo-1553413077-190dd305871c?w=400&h=200&fit=crop&auto=format',5),
('project-tracker','Project Tracker','Kelola proyek tim dengan task board, deadline, dan laporan progres mingguan.','Produktivitas','Free','https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=200&fit=crop&auto=format',6)
on conflict (slug) do update set
  title=excluded.title, description=excluded.description, category=excluded.category,
  pricing=excluded.pricing, image=excluded.image, sort_order=excluded.sort_order;
