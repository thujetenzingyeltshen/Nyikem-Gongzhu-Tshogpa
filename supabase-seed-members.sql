-- Seed original NGT members into Supabase
insert into public.members (serial_id, full_name, service_year, nyikem_year, resignation_year, joined_year, cid_no, date_of_birth, address, phone, email, last_post, spouse_or_kin, knowledge)
values
('NGT-001', 'Dasho Sangay Thinley', '', '1995', '', '2010', '11410000128', '01/06/47', 'Above DeSuung Training Centre, Taba, Thimphu', '17600942', '', '1. Secretary, Ministry of Agriculture
2. DG, Forests', 'Mrs. Kunga Choden 77109389', ''),
('NGT-002', 'Dasho Kunzang Wangdi', '', '2001', '2015', '2016', '11410008663', '17/07/53', 'Cho Sid Public Policy Publications & Studies (CSPPPS), P.O. Box 878, Rabjung Lam, Motithang, Thimphu', '17602000', 'dashokunzang@gmail.com', '1. Auditor General, RAA
2. Chief Election Comissioner', 'Mrs. Pem Tandi 17747451', 'Good governance and Election and Democracy'),
('NGT-003', 'Dasho Pem L. Dorji', '', '', '', '2024', '10503001520', '', 'Changzamto, Thimphu', '77490099', 'pemaldorji@gmail.com', '1. Secretary, Ministry of Labour & Human Resources', '', ''),
('NGT-004', 'Dasho Dr. Gado Tshering', '', '2006', '', '2014', '10501001024', '08/05/59', 'House No. 1, Yangchenphug Colony, Thimphu', '17110142', 'gadotshering7@gmail.com', '1.Secretary, Ministry of Health', 'Thinley Jamtsho Tshering 77777007', ''),
('NGT-005', 'Dasho Rinzin Gyaltshen', '', '1986', '', '2024', '11007000606', '15/1/51', 'The Pema Hotel, Motithang, Thimphu', '17628118', 'rinzipem2025@gmail.com', '1. Zhung Kalyon
2. Eminent Supreme Court Justice', 'Pema Gyaltshen 17602076', ''),
('NGT-006', 'Lyonpo Leki Dorji', '', '1981', '', '2024', '11410005834', '31/12/44', 'Hejo, Thimphu', '77123001', 'lekidoji@yahoo.com', '1. Minister of Information & Communications', 'Ms. Yangchen Ongmo 77604300', ''),
('NGT-007', 'Lyonpo Om Pradhan', '', '1977', '', '2016', '11410002078', '', 'Semtokha, Thimphu', '77605740', 'semtokha@gmail.com', '1. Permanent Representative to the U.N., New York
2. Tengye Lyonpo', 'Wangyal Rigzen, Thimphu', 'History, National & Regional developments, Bhutanese language'),
('NGT-008', 'Dasho Sonam Tshering', '', '2006', '', '2018', '10805002149', '03/09/58', '27 Kunzang Lam, Lower Motithang, Thimphu', '17117760', 'sonamtshering39@gmail.com', '1.Secretary. Ministry of Economic Affairs 
Retired: 30 June 2016', 'Sangay Zam, 17603123', ''),
('NGT-009', 'Dasho Sangay Khandu', '', '2009', '', '2024', '10811000436', '27/9/56', 'Lower Motithang, Norden Lam, House No. 14, Thimphu', '17115454', 'dashosangaykhandu@gmail.com', '1. Chairman, DHI
2. Secretary, National Land Commission', 'Dechen Om 17110897', ''),
('NGT-010', 'Dasho Dawa Tshering', '', '1999', '', '2010', '10806000991', '15/10/54', 'Paro Nemjo, Dobu, Paro', '17603997', 'dawatshering8@gmail.com', '1. Dzongda, Punakha
2. DG, Bhutan Forests
Retired: 2008', 'Tshering Pem 17603998', ''),
('NGT-011', 'Dasho Penjor Dorji', '', '1991', '', '2010', '10501000165', '', 'P.O. Box 916, Thimphu', '77117711', 'pejordorji48@gmail.com', '', '', ''),
('NGT-012', 'Dasho Yeshi Wangdi', '', '2012', '', '2020', '10710000560', '03/10/59', '10 Bangdu Lam, Chang Bangdu, Thimphu', '17640974', 'ywangdue@gmail.com', 'Secretary, Ministry of Economic Affairs', 'Spouse: Lemo, 17610618; Son: Sonam Dendup, 77325961', ''),
('NGT-013', 'Dasho Ugen Chewang', '', '2011', '', '2025', '11107001106', '', 'Taba, Thimphu', '17603693', 'ugenchewang1955@gmail.com', '1. Auditor General, RAA
2. Chairman, DHI', 'Ninda Wangmo, 17990052
Laigden Dzed, 17350103', ''),
('NGT-014', 'Dasho Sherub Gyeltshen', '', '1997', '', '2025', '11410003114', '16/12/54', 'House No. 32, Motithang, Thimphu', '17609577', 'shegyel9@gmail.com', '1. Minister, Ministry of Home Affairs 
2. Secretary, Dzongkha Development Commission', 'Sonam Yangtsho, 17110690', ''),
('NGT-015', 'Dasho Phuntso Norbu', '', '2012', '2018', '2020', '10710001921', '01/01/59', 'House No. 1, Changjalu, Thimphu', '17112103', 'phuntsonorbu9@gmail.com', '1. DG Dept. of Industry, Ministry of Economic Affairs
2. JMD Punatshangchu- I & II HEPs.', 'Sangay Choden, 17629914
Tsering Dema, 17884480', 'Applied geology, hydropower construction & industrial development'),
('NGT-016', 'Dasho Sherub Tenzin', '', '', '', '2012', '10715000153', '06/06/51', 'Tashi Woed Seling Khim, Doled Zur Lam -172 SE, Semtokha, Thimphu', '77172917', 'dashosherub@yahoo.com', '1. Cabinet Secretary
2. Ambassador to Kuwait', '', ''),
('NGT-017', 'Dasho Chagyel', '', '1983', '', '2010', '', '1940', 'Upper Motithang (below Sershang School), Thimphu', '17600797', 'dashochagyel@gmail.com', '1. Thrimpon, High Court
2. Thrimpon, Zhemgang/Chhukha', '', ''),
('NGT-018', 'Dasho Dorjee Namgyel', '', '1987', '', '2010', '', '1949', 'Khasadrapchu, Thimphu', '17646593', '', '1. MD, State Trading Corporation of Bhutan Ltd.
Retired: 2006', '', ''),
('NGT-019', 'Dasho Pem Tshering', '', '', '', '2010', '', '1943', '', '', '', '1. Judge at High Court
2. Vice-President, BCCI', '', ''),
('NGT-020', 'Dasho Zangley Dukpa', '', '', '', '2020', '10903000774', '02/02/50', 'Lubding, Thimphu', '17111880', 'dashozangleyd@gmail.com', '1. Minister for Health
2. Vice-Chancellor of RUB', 'Mrs. Karma 17600654
Pema Namgay 77200597', 'Positive Thinking and Leadership'),
('NGT-021', 'Dasho Pema Thinley', '', '2006', '', '2016', '10709002563', '17/01/51', 'Building 25, Flat 402, Dham Dhajo, Lower Motithang, Thimphu', '17601910', 'pemathinley326@gmail.com', '1. Secretary, Ministry of Education
2. Vice Chancellor, RUB', '1. Tshering Pelmo 17627239
2. Palmo Thinley 17533508', 'Education,'),
('NGT-022', 'Dasho Dhondup Phuntsho', '', '', '', '2010', '11410002991', '', '', '77210387', '', '', '', ''),
('NGT-023', 'Dasho Sangay Tenzin', '', '', '', '2010', '', '', '', '17959688', '', '', '', ''),
('NGT-024', 'Dasho Yanki T. Wangchuk', '', '', '', '2013', '10802000597', '', 'Above Memorial Chorten, Thimphu', '17344368', 'yankiwangchuk7@gmail.com', '1. Secretary, Ministry of Finance
2. Auditor General, RAA', '', ''),
('NGT-025', 'Dasho Pasang Tobgay', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-026', 'Dasho Phub Dorji', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-027', 'Dasho Dorji Norbu', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-028', 'Dasho Karma Dorjee (MTI)', '', '', '', '2010', '11410003682', '', 'Below Thimphu Deluxe Hotel, 
Motithang, Thimphu', '17601899', '', '1. Secretary, Ministry of Trade, 
    Industry & Power', '', ''),
('NGT-029', 'Dasho Karma Dorji (DNP)', '', '', '', '2010', '', '', '', '17117666
17720802', '', '1. DG, Dept. of 
    National Property
2.', '', ''),
('NGT-030', 'Dasho Namgay', '', '', '', '2010', '11910001663', '', '', '', '', '', '', ''),
('NGT-031', 'Dasho Phub Tshering', '', '', '', '2010', '', '', '', '17600027', '', '', '', ''),
('NGT-032', 'Dasho Dr. P.W. Samdrup', '', '', '', '2010', '', '', '', '17119837', '', '', '', ''),
('NGT-033', 'Dasho Dago Tshering', '', '', '', '2010', '', '', '', '17603318', '', '', '', ''),
('NGT-034', 'Dasho Gasey Lhundup', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-035', 'Dasho Dophu Tshering', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-036', 'Dasho Penden Wangchuk', '', '', '', '2016', '', '', '', '', '', '', '', ''),
('NGT-037', 'Dasho Lhakpa Dorji', '', '', '', '2014', '', '', '', '', '', '', '', ''),
('NGT-038', 'Dasho Lhadarla', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-039', 'Dasho Dorji Wangdi', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-040', 'Dasho D.N. Katwal', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-041', 'Dasho Phub Dorji
(Wachep)', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-042', 'Dasho H.K Humagai', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-043', 'Dasho Wangdi', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-044', 'Dasho Oko Tshering', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-045', 'Dasho Sangay Dorji
(HC)', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-046', 'Dasho Tashi Phuntsog', '', '1995', '2012', '2016', '1704001024', '23/10/1955', 'Above Thori Resort, Lubding,
Lungtenphu, Thimphu', '77187777
17777369', 'gyalrigtshang@gmail.com', '1. Cabinet Secretary
2. Ambassador to Kuwait', 'Rinzin Wangmo 77228070
Kezang Choden 77246118', ''),
('NGT-047', 'Dasho Khandu', '', '', '', '2012', '', '', '', '', '', '', '', ''),
('NGT-048', 'Dasho Sherab Thaye', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-049', 'Dasho Jambay', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-050', 'Dasho R.N. Dhital', '', '', '', '2010', '', '', '', '', '', '', '', ''),
('NGT-051', 'Dasho Jigme Tshultim', '', '', '', '2025', '', '', '', '', '', '', '', '')
on conflict (serial_id) do update set
  full_name = excluded.full_name,
  service_year = excluded.service_year,
  nyikem_year = excluded.nyikem_year,
  resignation_year = excluded.resignation_year,
  joined_year = excluded.joined_year,
  cid_no = excluded.cid_no,
  date_of_birth = excluded.date_of_birth,
  address = excluded.address,
  phone = excluded.phone,
  email = excluded.email,
  last_post = excluded.last_post,
  spouse_or_kin = excluded.spouse_or_kin,
  knowledge = excluded.knowledge;
