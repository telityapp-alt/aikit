-- aikit - clean module catalog and align covers with local production assets

delete from public.modules
where slug in (
  'crm-lite',
  'hr-attendance',
  'content-planner',
  'inventory-manager',
  'project-tracker'
);

update public.modules
set image = case slug
  when 'keuangan-pribadi' then '/module-covers/keuangan-pribadi.png'
  when 'contact-manager' then '/module-covers/contact-manager.png'
  when 'campaign-manager' then '/module-covers/campaign-manager.png'
  when 'content-calendar' then '/module-covers/content-calendar.png'
  when 'competitor-analyzer' then '/automation-covers/competitor-analyzer.webp'
  when 'tiktok-profile-intelligence' then '/automation-covers/tiktok-profile-intelligence.webp'
  when 'instagram-profile-intelligence' then '/automation-covers/instagram-profile-intelligence.webp'
  when 'tiktok-ads-spy' then '/automation-covers/tiktok-ads-spy.webp'
  when 'meta-ads-spy' then '/automation-covers/meta-ads-spy.webp'
  else image
end
where slug in (
  'keuangan-pribadi',
  'contact-manager',
  'campaign-manager',
  'content-calendar',
  'competitor-analyzer',
  'tiktok-profile-intelligence',
  'instagram-profile-intelligence',
  'tiktok-ads-spy',
  'meta-ads-spy'
);
