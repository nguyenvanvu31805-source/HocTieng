require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mysql = require("mysql2/promise");

const VOCABULARY_STUDY_SETS = [
  {
    title: "Character – Tính cách",
    description: "Học các từ vựng tiếng Anh cơ bản về tính cách và phẩm chất của con người.",
    category: "Daily Life",
    language: "English",
    cards: [
      { term: "kind", definition: "tốt bụng", pronunciation: "/kaɪnd/", example: "She is always kind to everyone." },
      { term: "friendly", definition: "thân thiện", pronunciation: "/ˈfrendli/", example: "Our new neighbors are very friendly." },
      { term: "honest", definition: "trung thực, thật thà", pronunciation: "/ˈɒnɪst/", example: "An honest person always tells the truth." },
      { term: "brave", definition: "dũng cảm", pronunciation: "/breɪv/", example: "The brave firefighter saved the cat." },
      { term: "shy", definition: "nhút nhát, e thẹn", pronunciation: "/ʃaɪ/", example: "He was too shy to speak in public." },
      { term: "quiet", definition: "trầm lặng, ít nói", pronunciation: "/ˈkwaɪət/", example: "My brother is quiet and thoughtful." },
      { term: "funny", definition: "hài hước, vui tính", pronunciation: "/ˈfʌni/", example: "He told a funny story that made us laugh." },
      { term: "serious", definition: "nghiêm túc", pronunciation: "/ˈsɪəriəs/", example: "The teacher looked very serious today." },
      { term: "polite", definition: "lịch sự, lễ phép", pronunciation: "/pəˈlaɪt/", example: "It is polite to say thank you." },
      { term: "rude", definition: "thô lỗ, bất lịch sự", pronunciation: "/ruːd/", example: "It is rude to interrupt other people." },
      { term: "lazy", definition: "lười biếng", pronunciation: "/ˈleɪzi/", example: "Don't be lazy, finish your work." },
      { term: "hardworking", definition: "chăm chỉ, cần cù", pronunciation: "/ˌhɑːdˈwɜːkɪŋ/", example: "She is a hardworking student." },
      { term: "smart", definition: "thông minh, nhanh nhạy", pronunciation: "/smɑːt/", example: "That was a very smart solution." },
      { term: "clever", definition: "khéo léo, lanh lợi", pronunciation: "/ˈklevər/", example: "The clever dog learned new tricks quickly." },
      { term: "patient", definition: "kiên nhẫn, nhẫn nại", pronunciation: "/ˈpeɪʃnt/", example: "You need to be patient with small children." },
      { term: "careful", definition: "cẩn thận, chu đáo", pronunciation: "/ˈkeəfl/", example: "Be careful when you cross the street." },
      { term: "helpful", definition: "hay giúp đỡ, hữu ích", pronunciation: "/ˈhelpfl/", example: "The staff was extremely helpful." },
      { term: "generous", definition: "rộng lượng, hào phóng", pronunciation: "/ˈdʒenərəs/", example: "He is generous with his time and money." },
      { term: "confident", definition: "tự tin", pronunciation: "/ˈkɒnfɪdənt/", example: "She feels confident about the interview." },
      { term: "creative", definition: "sáng tạo", pronunciation: "/kriˈeɪtɪv/", example: "Children are usually very creative." },
    ],
  },
  {
    title: "Family – Gia đình",
    description: "Học các từ vựng tiếng Anh cơ bản về gia đình và các thành viên trong gia đình.",
    category: "People",
    language: "English",
    cards: [
      { term: "father", definition: "bố, cha", pronunciation: "/ˈfɑːðər/", example: "My father reads the newspaper every morning." },
      { term: "mother", definition: "mẹ", pronunciation: "/ˈmʌðər/", example: "My mother cooks delicious meals for us." },
      { term: "parent", definition: "phụ huynh, cha mẹ", pronunciation: "/ˈpeərənt/", example: "Every parent wants the best for their child." },
      { term: "son", definition: "con trai", pronunciation: "/sʌn/", example: "They have one son and two daughters." },
      { term: "daughter", definition: "con gái", pronunciation: "/ˈdɔːtər/", example: "Her daughter is five years old." },
      { term: "brother", definition: "anh trai, em trai", pronunciation: "/ˈbrʌðər/", example: "My brother helps me with my homework." },
      { term: "sister", definition: "chị gái, em gái", pronunciation: "/ˈsɪstər/", example: "Her sister plays the piano beautifully." },
      { term: "husband", definition: "người chồng", pronunciation: "/ˈhʌzbənd/", example: "Her husband works at a bank." },
      { term: "wife", definition: "người vợ", pronunciation: "/waɪf/", example: "His wife is a talented doctor." },
      { term: "grandfather", definition: "ông nội, ông ngoại", pronunciation: "/ˈɡrænfɑːðər/", example: "My grandfather tells great stories." },
      { term: "grandmother", definition: "bà nội, bà ngoại", pronunciation: "/ˈɡrænmʌðər/", example: "My grandmother bakes wonderful cookies." },
      { term: "grandson", definition: "cháu trai (của ông bà)", pronunciation: "/ˈɡrænsʌn/", example: "He loves playing chess with his grandson." },
      { term: "granddaughter", definition: "cháu gái (của ông bà)", pronunciation: "/ˈɡrændɔːtər/", example: "Their granddaughter visited them last weekend." },
      { term: "uncle", definition: "chú, bác, cậu", pronunciation: "/ˈʌŋkl/", example: "My uncle lives in another city." },
      { term: "aunt", definition: "cô, dì, bác gái", pronunciation: "/ɑːnt/", example: "Aunt Mary sent me a birthday present." },
      { term: "cousin", definition: "anh chị em họ", pronunciation: "/ˈkʌzn/", example: "I spent the summer vacation with my cousin." },
      { term: "nephew", definition: "cháu trai (con của anh chị em)", pronunciation: "/ˈnefjuː/", example: "He bought a toy car for his nephew." },
      { term: "niece", definition: "cháu gái (con của anh chị em)", pronunciation: "/niːs/", example: "My niece is learning how to swim." },
      { term: "child", definition: "đứa con, đứa trẻ", pronunciation: "/tʃaɪld/", example: "The child is playing in the garden." },
      { term: "relative", definition: "họ hàng, người thân", pronunciation: "/ˈrelətɪv/", example: "We invited all our relatives to the party." },
    ],
  },
  {
    title: "Jobs – Nghề nghiệp",
    description: "Học các từ vựng tiếng Anh cơ bản về nghề nghiệp và công việc phổ biến.",
    category: "Career",
    language: "English",
    cards: [
      { term: "teacher", definition: "giáo viên", pronunciation: "/ˈtiːtʃər/", example: "Our English teacher is very dedicated." },
      { term: "doctor", definition: "bác sĩ", pronunciation: "/ˈdɒktər/", example: "The doctor examined the patient carefully." },
      { term: "nurse", definition: "y tá", pronunciation: "/nɜːs/", example: "The nurse gave me some medicine." },
      { term: "engineer", definition: "kỹ sư", pronunciation: "/ˌendʒɪˈnɪər/", example: "My brother works as a civil engineer." },
      { term: "driver", definition: "tài xế, người lái xe", pronunciation: "/ˈdraɪvər/", example: "The bus driver stopped at the station." },
      { term: "farmer", definition: "nông dân", pronunciation: "/ˈfɑːmər/", example: "The farmer grows vegetables in the field." },
      { term: "chef", definition: "đầu bếp", pronunciation: "/ʃef/", example: "The chef prepared a special dinner tonight." },
      { term: "pilot", definition: "phi công", pronunciation: "/ˈpaɪlət/", example: "The pilot flew the airplane through the storm." },
      { term: "police officer", definition: "cảnh sát", pronunciation: "/pəˈliːs ˈɒfɪsər/", example: "The police officer directed the traffic." },
      { term: "firefighter", definition: "lính cứu hỏa", pronunciation: "/ˈfaɪəfaɪtər/", example: "Firefighters arrived quickly to extinguish the fire." },
      { term: "dentist", definition: "nha sĩ", pronunciation: "/ˈdentɪst/", example: "You should visit the dentist twice a year." },
      { term: "lawyer", definition: "luật sư", pronunciation: "/ˈlɔːjər/", example: "She hired a lawyer to give her legal advice." },
      { term: "journalist", definition: "nhà báo", pronunciation: "/ˈdʒɜːnəlɪst/", example: "The journalist interviewed the mayor yesterday." },
      { term: "designer", definition: "nhà thiết kế", pronunciation: "/dɪˈzaɪnər/", example: "A fashion designer created this dress." },
      { term: "programmer", definition: "lập trình viên", pronunciation: "/ˈprəʊɡræmər/", example: "The programmer wrote clean code for the app." },
      { term: "mechanic", definition: "thợ sửa chữa máy móc", pronunciation: "/məˈkænɪk/", example: "The mechanic repaired my car this morning." },
      { term: "architect", definition: "kiến trúc sư", pronunciation: "/ˈɑːkɪtekt/", example: "The architect designed a modern house." },
      { term: "accountant", definition: "kế toán viên", pronunciation: "/əˈkaʊntənt/", example: "The accountant is checking financial reports." },
      { term: "waiter", definition: "người phục vụ bàn", pronunciation: "/ˈweɪtər/", example: "The waiter brought water to our table." },
      { term: "manager", definition: "người quản lý, giám đốc", pronunciation: "/ˈmænɪdʒər/", example: "Our project manager organized the meeting." },
    ],
  },
  {
    title: "Education – Giáo dục",
    description: "Học các từ vựng tiếng Anh cơ bản về môi trường giáo dục và việc học tập.",
    category: "Education",
    language: "English",
    cards: [
      { term: "school", definition: "trường học", pronunciation: "/skuːl/", example: "She walks to school every morning." },
      { term: "student", definition: "học sinh, sinh viên", pronunciation: "/ˈstjuːdnt/", example: "Every student must follow school rules." },
      { term: "lesson", definition: "bài học", pronunciation: "/ˈlesn/", example: "Today we have an interesting grammar lesson." },
      { term: "classroom", definition: "phòng học, lớp học", pronunciation: "/ˈklɑːsruːm/", example: "The students are sitting in the classroom." },
      { term: "homework", definition: "bài tập về nhà", pronunciation: "/ˈhəʊmwɜːk/", example: "I always do my homework before dinner." },
      { term: "exam", definition: "kỳ thi, bài thi lớn", pronunciation: "/ɪɡˈzæm/", example: "He studied hard for the final exam." },
      { term: "test", definition: "bài kiểm tra", pronunciation: "/test/", example: "We have a vocabulary test tomorrow." },
      { term: "grade", definition: "điểm số, điểm thi", pronunciation: "/ɡreɪd/", example: "She received an excellent grade on her essay." },
      { term: "course", definition: "khóa học", pronunciation: "/kɔːs/", example: "I enrolled in an online English course." },
      { term: "university", definition: "trường đại học", pronunciation: "/ˌjuːnɪˈvɜːsəti/", example: "He wants to study medicine at university." },
      { term: "college", definition: "trường cao đẳng, đại học", pronunciation: "/ˈkɒlɪdʒ/", example: "Many students live on the college campus." },
      { term: "library", definition: "thư viện", pronunciation: "/ˈlaɪbrəri/", example: "You can borrow reference books from the library." },
      { term: "education", definition: "nền giáo dục, sự giáo dục", pronunciation: "/ˌedʒuˈkeɪʃn/", example: "Education plays a vital role in society." },
      { term: "knowledge", definition: "kiến thức, tri thức", pronunciation: "/ˈnɒlɪdʒ/", example: "Reading books helps expand your knowledge." },
      { term: "study", definition: "học tập, nghiên cứu", pronunciation: "/ˈstʌdi/", example: "I study English for two hours every day." },
      { term: "learn", definition: "học hỏi, tiếp thu", pronunciation: "/lɜːn/", example: "We learn new words through flashcards." },
      { term: "practice", definition: "luyện tập, thực hành", pronunciation: "/ˈpræktɪs/", example: "Practice speaking English whenever you can." },
      { term: "question", definition: "câu hỏi", pronunciation: "/ˈkwestʃən/", example: "Please raise your hand if you have a question." },
      { term: "answer", definition: "câu trả lời", pronunciation: "/ˈɑːnsər/", example: "She gave the correct answer to the question." },
      { term: "scholarship", definition: "học bổng", pronunciation: "/ˈskɒləʃɪp/", example: "She won a scholarship to study abroad." },
    ],
  },
  {
    title: "Subjects – Môn học",
    description: "Học các từ vựng tiếng Anh cơ bản về các môn học trong nhà trường.",
    category: "Education",
    language: "English",
    cards: [
      { term: "mathematics", definition: "môn toán học", pronunciation: "/ˌmæθəˈmætɪks/", example: "Mathematics is an important subject in school." },
      { term: "English", definition: "môn tiếng Anh", pronunciation: "/ˈɪŋɡlɪʃ/", example: "English is spoken in many countries around the world." },
      { term: "history", definition: "môn lịch sử", pronunciation: "/ˈhɪstri/", example: "We learn about ancient civilizations in history class." },
      { term: "geography", definition: "môn địa lý", pronunciation: "/dʒiˈɒɡrəfi/", example: "Geography teaches us about maps and continents." },
      { term: "biology", definition: "môn sinh học", pronunciation: "/baɪˈɒlədʒi/", example: "Biology is the study of living organisms." },
      { term: "chemistry", definition: "môn hóa học", pronunciation: "/ˈkemɪstri/", example: "Students do experiments in the chemistry lab." },
      { term: "physics", definition: "môn vật lý", pronunciation: "/ˈfɪzɪks/", example: "Physics explains how matter and energy interact." },
      { term: "literature", definition: "môn ngữ văn", pronunciation: "/ˈlɪtrətʃər/", example: "We analyze classic poems in literature class." },
      { term: "art", definition: "môn mỹ thuật, hội họa", pronunciation: "/ɑːt/", example: "She loves drawing and painting in art class." },
      { term: "computer science", definition: "môn khoa học máy tính", pronunciation: "/kəmˈpjuːtər ˈsaɪəns/", example: "Computer science teaches coding and algorithms." },
      { term: "science", definition: "môn khoa học tự nhiên", pronunciation: "/ˈsaɪəns/", example: "Science helps us understand natural phenomena." },
      { term: "economics", definition: "môn kinh tế học", pronunciation: "/ˌiːkəˈnɒmɪks/", example: "Economics explains how markets and trade operate." },
      { term: "psychology", definition: "môn tâm lý học", pronunciation: "/saɪˈkɒlədʒi/", example: "Psychology investigates human thoughts and behavior." },
      { term: "physical education", definition: "môn thể dục", pronunciation: "/ˌfɪzɪkl ˌedʒuˈkeɪʃn/", example: "We play sports during physical education class." },
      { term: "civics", definition: "môn giáo dục công dân", pronunciation: "/ˈsɪvɪks/", example: "Civics teaches students about rights and responsibilities." },
      { term: "foreign language", definition: "môn ngoại ngữ", pronunciation: "/ˈfɒrən ˈlæŋɡwɪdʒ/", example: "Learning a foreign language opens new career doors." },
      { term: "technology", definition: "môn công nghệ", pronunciation: "/tekˈnɒlədʒi/", example: "Technology class introduces modern engineering tools." },
      { term: "social studies", definition: "môn khoa học xã hội", pronunciation: "/ˈsəʊʃl ˈstʌdiz/", example: "Social studies explores community life and cultures." },
      { term: "geometry", definition: "môn hình học", pronunciation: "/dʒiˈɒmətri/", example: "We calculate angles and shapes in geometry." },
      { term: "algebra", definition: "môn đại số", pronunciation: "/ˈældʒɪbrə/", example: "Algebra involves solving equations with unknowns." },
    ],
  },
  {
    title: "School Objects – Đồ dùng học tập",
    description: "Học các từ vựng tiếng Anh cơ bản về các dụng cụ và đồ dùng học tập quen thuộc.",
    category: "School",
    language: "English",
    cards: [
      { term: "book", definition: "cuốn sách", pronunciation: "/bʊk/", example: "I read an interesting book yesterday." },
      { term: "notebook", definition: "quyển vở, sổ tay", pronunciation: "/ˈnəʊtbʊk/", example: "Write your lecture notes in this notebook." },
      { term: "pen", definition: "bút bi, bút mực", pronunciation: "/pen/", example: "Can I borrow a blue pen to sign this form?" },
      { term: "pencil", definition: "bút chì", pronunciation: "/ˈpensl/", example: "Use a sharp pencil for your sketch." },
      { term: "eraser", definition: "cục tẩy, gôm", pronunciation: "/ɪˈreɪsər/", example: "She used an eraser to correct the spelling." },
      { term: "ruler", definition: "thước kẻ", pronunciation: "/ˈruːlər/", example: "Draw a straight line using your ruler." },
      { term: "backpack", definition: "ba lô đi học", pronunciation: "/ˈbækpæk/", example: "He packed all his textbooks into his backpack." },
      { term: "pencil case", definition: "hộp bút, bóp viết", pronunciation: "/ˈpensl keɪs/", example: "Keep your stationery inside the pencil case." },
      { term: "marker", definition: "bút lông, bút dạ", pronunciation: "/ˈmɑːkər/", example: "The teacher wrote keywords with a green marker." },
      { term: "highlighter", definition: "bút dạ quang, bút nhớ", pronunciation: "/ˈhaɪlaɪtər/", example: "Use a yellow highlighter to mark main ideas." },
      { term: "dictionary", definition: "từ điển", pronunciation: "/ˈdɪkʃənri/", example: "You can check new definitions in the dictionary." },
      { term: "calculator", definition: "máy tính cầm tay", pronunciation: "/ˈkælkjuleɪtər/", example: "Bring a calculator for tomorrow's math exam." },
      { term: "scissors", definition: "cái kéo", pronunciation: "/ˈsɪzəz/", example: "Be careful when cutting craft paper with scissors." },
      { term: "glue", definition: "keo dán, hồ dán", pronunciation: "/ɡluː/", example: "Apply a little glue to stick the pictures together." },
      { term: "paper", definition: "tờ giấy", pronunciation: "/ˈpeɪpər/", example: "Take out a blank sheet of paper for the test." },
      { term: "folder", definition: "kẹp tài liệu, bìa hồ sơ", pronunciation: "/ˈfəʊldər/", example: "Store your graded assignments in a plastic folder." },
      { term: "sharpener", definition: "cái gọt bút chì", pronunciation: "/ˈʃɑːpnər/", example: "My pencil tip broke, do you have a sharpener?" },
      { term: "compass", definition: "compa vẽ đường tròn", pronunciation: "/ˈkʌmpəs/", example: "Use a compass to draw an exact circle." },
      { term: "stapler", definition: "cái dập ghim", pronunciation: "/ˈsteɪplər/", example: "Fasten those exam sheets together with a stapler." },
      { term: "crayon", definition: "bút màu sáp", pronunciation: "/ˈkreɪən/", example: "The boy colored the picture using wax crayons." },
    ],
  },
  {
    title: "Clothes – Quần áo",
    description: "Học các từ vựng tiếng Anh cơ bản về trang phục, quần áo và phụ kiện thời trang thường ngày.",
    category: "Fashion",
    language: "English",
    cards: [
      { term: "shirt", definition: "áo sơ mi", pronunciation: "/ʃɜːt/", example: "He wore a clean white shirt to work." },
      { term: "T-shirt", definition: "áo phông, áo thun", pronunciation: "/ˈtiː ʃɜːt/", example: "A cotton T-shirt is comfortable in warm weather." },
      { term: "trousers", definition: "quần tây, quần dài", pronunciation: "/ˈtraʊzəz/", example: "He bought a pair of dark trousers for formal events." },
      { term: "jeans", definition: "quần bò, quần jean", pronunciation: "/dʒiːnz/", example: "Blue jeans match nicely with any casual shirt." },
      { term: "shorts", definition: "quần soóc, quần đùi", pronunciation: "/ʃɔːts/", example: "We wear shorts and sandals when going to the beach." },
      { term: "skirt", definition: "chân váy", pronunciation: "/skɜːt/", example: "She chose a pleated skirt for the presentation." },
      { term: "dress", definition: "váy liền thân, đầm", pronunciation: "/dres/", example: "She wore an elegant evening dress to the gala." },
      { term: "jacket", definition: "áo khoác ngắn", pronunciation: "/ˈdʒækɪt/", example: "Put on a light jacket because the wind is cool." },
      { term: "coat", definition: "áo khoác dài, măng tô", pronunciation: "/kəʊt/", example: "A wool coat keeps you warm on snowy days." },
      { term: "sweater", definition: "áo len", pronunciation: "/ˈswetər/", example: "My mother knitted a cozy sweater for my birthday." },
      { term: "hoodie", definition: "áo nỉ có mũ", pronunciation: "/ˈhʊdi/", example: "He pulled up the hood of his hoodie against the rain." },
      { term: "socks", definition: "đôi tất, vớ", pronunciation: "/sɒks/", example: "Put on clean socks before wearing running shoes." },
      { term: "shoes", definition: "đôi giày", pronunciation: "/ʃuːz/", example: "Please leave your shoes outside the apartment." },
      { term: "boots", definition: "đôi bốt, ủng", pronunciation: "/buːts/", example: "Leather boots protect your feet from mud and water." },
      { term: "sandals", definition: "dép xăng đan", pronunciation: "/ˈsændlz/", example: "Light sandals are ideal for walking on the sand." },
      { term: "hat", definition: "mũ có vành", pronunciation: "/hæt/", example: "Wear a wide hat to shield your face from strong sunlight." },
      { term: "cap", definition: "mũ lưỡi trai", pronunciation: "/kæp/", example: "He adjusted his sports cap before the baseball match." },
      { term: "scarf", definition: "khăn quàng cổ", pronunciation: "/skɑːf/", example: "Wrap this warm scarf around your neck." },
      { term: "gloves", definition: "đôi găng tay", pronunciation: "/ɡlʌvz/", example: "Wear thermal gloves to protect your hands from the freezing air." },
      { term: "belt", definition: "thắt lưng, dây nịt", pronunciation: "/belt/", example: "He fastened his brown leather belt." },
    ],
  },
  {
    title: "House – Nhà ở",
    description: "Học các từ vựng tiếng Anh cơ bản về nhà ở, các khu vực và cấu trúc không gian của ngôi nhà.",
    category: "Home",
    language: "English",
    cards: [
      { term: "house", definition: "ngôi nhà", pronunciation: "/haʊs/", example: "They live in a beautiful two-story house." },
      { term: "apartment", definition: "căn hộ chung cư", pronunciation: "/əˈpɑːtmənt/", example: "Their apartment has a great view of the city center." },
      { term: "door", definition: "cánh cửa ra vào", pronunciation: "/dɔːr/", example: "Please shut the front door behind you." },
      { term: "window", definition: "cửa sổ", pronunciation: "/ˈwɪndəʊ/", example: "Sunshine poured in through the glass window." },
      { term: "roof", definition: "mái nhà", pronunciation: "/ruːf/", example: "Rain tapped rhythmically on the metal roof." },
      { term: "wall", definition: "bức tường", pronunciation: "/wɔːl/", example: "We painted the living room wall light blue." },
      { term: "floor", definition: "sàn nhà", pronunciation: "/flɔːr/", example: "The wooden floor is polished and clean." },
      { term: "stairs", definition: "cầu thang bộ", pronunciation: "/steəz/", example: "Walk down the stairs carefully to avoid falling." },
      { term: "garden", definition: "khu vườn", pronunciation: "/ˈɡɑːdn/", example: "Grandma grows roses and herbs in the garden." },
      { term: "garage", definition: "nhà để xe, ga-ra", pronunciation: "/ˈɡærɑːʒ/", example: "Dad parked the family car inside the garage." },
      { term: "balcony", definition: "ban công", pronunciation: "/ˈbælkəni/", example: "We set out potted plants on the balcony." },
      { term: "yard", definition: "cái sân", pronunciation: "/jɑːd/", example: "The puppy loves chasing a ball across the yard." },
      { term: "bathroom", definition: "phòng tắm", pronunciation: "/ˈbɑːθruːm/", example: "The guest bathroom is on the first floor." },
      { term: "bedroom", definition: "phòng ngủ", pronunciation: "/ˈbedruːm/", example: "My bedroom is quiet and perfect for studying." },
      { term: "kitchen", definition: "nhà bếp", pronunciation: "/ˈkɪtʃɪn/", example: "Mom is preparing breakfast in the kitchen." },
      { term: "living room", definition: "phòng khách", pronunciation: "/ˈlɪvɪŋ ruːm/", example: "We welcome our guests into the spacious living room." },
      { term: "dining room", definition: "phòng ăn", pronunciation: "/ˈdaɪnɪŋ ruːm/", example: "The dining table is set in the dining room." },
      { term: "hallway", definition: "hành lang", pronunciation: "/ˈhɔːlweɪ/", example: "The long hallway connects all the upstairs bedrooms." },
      { term: "basement", definition: "tầng hầm", pronunciation: "/ˈbeɪsmənt/", example: "Tools and storage boxes are kept down in the basement." },
      { term: "attic", definition: "gác mái", pronunciation: "/ˈætɪk/", example: "They found vintage photo albums in the attic." },
    ],
  },
  {
    title: "Bedroom, Living Room & Kitchen – Phòng ngủ, phòng khách và nhà bếp",
    description: "Học các từ vựng tiếng Anh cơ bản về các đồ đạc, thiết bị và vật dụng trong phòng ngủ, phòng khách và nhà bếp.",
    category: "Home",
    language: "English",
    cards: [
      { term: "bed", definition: "cái giường", pronunciation: "/bed/", example: "I make my bed every morning right after waking up." },
      { term: "pillow", definition: "cái gối", pronunciation: "/ˈpɪləʊ/", example: "Rest your head on this comfortable pillow." },
      { term: "blanket", definition: "cái chăn, mền", pronunciation: "/ˈblæŋkɪt/", example: "Pull up the blanket when the room feels chilly." },
      { term: "wardrobe", definition: "tủ quần áo", pronunciation: "/ˈwɔːdrəʊb/", example: "She arranged all her winter coats inside the wardrobe." },
      { term: "lamp", definition: "đèn bàn, đèn ngủ", pronunciation: "/læmp/", example: "Turn off the lamp before going to sleep." },
      { term: "mirror", definition: "cái gương", pronunciation: "/ˈmɪrər/", example: "Check your hair in the mirror before heading out." },
      { term: "alarm clock", definition: "đồng hồ báo thức", pronunciation: "/əˈlɑːm klɒk/", example: "The alarm clock went off sharply at 6:30 AM." },
      { term: "sofa", definition: "ghế sô pha", pronunciation: "/ˈsəʊfə/", example: "We sat together on the sofa to watch television." },
      { term: "television", definition: "tivi, máy truyền hình", pronunciation: "/ˈtelɪvɪʒn/", example: "They turned on the television to catch the latest news." },
      { term: "coffee table", definition: "bàn trà", pronunciation: "/ˈkɒfi ˈteɪbl/", example: "A vase of fresh flowers stands on the coffee table." },
      { term: "armchair", definition: "ghế bành", pronunciation: "/ˈɑːmtʃeər/", example: "Father sat reading in his favorite leather armchair." },
      { term: "curtain", definition: "rèm cửa", pronunciation: "/ˈkɜːtn/", example: "She opened the curtain to let morning sunshine inside." },
      { term: "carpet", definition: "thảm trải sàn", pronunciation: "/ˈkɑːpɪt/", example: "The soft woolen carpet warms up the living room." },
      { term: "refrigerator", definition: "tủ lạnh", pronunciation: "/rɪˈfrɪdʒəreɪtər/", example: "Store leftover food in the refrigerator to keep it fresh." },
      { term: "oven", definition: "lò nướng", pronunciation: "/ˈʌvn/", example: "Bake the cookies in the preheated oven for 15 minutes." },
      { term: "stove", definition: "bếp nấu", pronunciation: "/stəʊv/", example: "Remember to turn off the gas stove after boiling soup." },
      { term: "sink", definition: "bồn rửa", pronunciation: "/sɪŋk/", example: "Wash your hands with soap at the kitchen sink." },
      { term: "plate", definition: "cái đĩa", pronunciation: "/pleɪt/", example: "She arranged the slices of cake neatly on a plate." },
      { term: "cup", definition: "cái tách, cái chén", pronunciation: "/kʌp/", example: "He poured hot tea into a ceramic cup." },
      { term: "microwave", definition: "lò vi sóng", pronunciation: "/ˈmaɪkrəweɪv/", example: "Heat your lunch in the microwave for two minutes." },
    ],
  },
  {
    title: "Food – Thức ăn",
    description: "Học các từ vựng tiếng Anh cơ bản về thực phẩm, đồ ăn và các nguyên liệu nấu nướng thường ngày.",
    category: "Food & Drinks",
    language: "English",
    cards: [
      { term: "rice", definition: "gạo, cơm", pronunciation: "/raɪs/", example: "Steamed white rice is served with every family meal." },
      { term: "bread", definition: "bánh mì", pronunciation: "/bred/", example: "Freshly baked bread smells wonderful in the morning." },
      { term: "noodles", definition: "mì sợi, bún, phở", pronunciation: "/ˈnuːdlz/", example: "He enjoyed a warm bowl of beef noodles." },
      { term: "meat", definition: "thịt", pronunciation: "/miːt/", example: "Fresh meat should be cooked thoroughly." },
      { term: "beef", definition: "thịt bò", pronunciation: "/biːf/", example: "She prepared tender beef stew for Sunday dinner." },
      { term: "pork", definition: "thịt lợn, thịt heo", pronunciation: "/pɔːk/", example: "Grilled pork chops are a popular dinner dish." },
      { term: "chicken", definition: "thịt gà", pronunciation: "/ˈtʃɪkɪn/", example: "We ordered crispy fried chicken with French fries." },
      { term: "fish", definition: "món cá, thịt cá", pronunciation: "/fɪʃ/", example: "Steamed fish with ginger is healthy and nutritious." },
      { term: "egg", definition: "quả trứng", pronunciation: "/eɡ/", example: "Fry an egg sunny-side up for a quick breakfast." },
      { term: "cheese", definition: "phô mai", pronunciation: "/tʃiːz/", example: "Grated cheese adds great flavor to hot pasta." },
      { term: "milk", definition: "sữa tươi", pronunciation: "/mɪlk/", example: "Drink a glass of cold milk after exercising." },
      { term: "apple", definition: "quả táo", pronunciation: "/ˈæpl/", example: "She sliced a crisp red apple for a healthy snack." },
      { term: "banana", definition: "quả chuối", pronunciation: "/bəˈnɑːnə/", example: "Bananas provide natural energy before a workout." },
      { term: "orange", definition: "quả cam", pronunciation: "/ˈɒrɪndʒ/", example: "This sweet orange is full of natural juice." },
      { term: "vegetable", definition: "rau củ", pronunciation: "/ˈvedʒtəbl/", example: "Eat plenty of green vegetables every day." },
      { term: "potato", definition: "củ khoai tây", pronunciation: "/pəˈteɪtəʊ/", example: "Boiled potato can be mashed with butter and milk." },
      { term: "tomato", definition: "quả cà chua", pronunciation: "/təˈmɑːtəʊ/", example: "Ripe red tomatoes make delicious pasta sauce." },
      { term: "soup", definition: "món súp, món canh", pronunciation: "/suːp/", example: "A warm bowl of chicken soup cures a cold." },
      { term: "cake", definition: "bánh ngọt, bánh kem", pronunciation: "/keɪk/", example: "They blew out birthday candles on top of the cake." },
      { term: "sandwich", definition: "bánh mì kẹp", pronunciation: "/ˈsænwɪtʃ/", example: "He took a tuna sandwich to work for lunch." },
    ],
  },
  {
    title: "Animals – Động vật",
    description: "Học các từ vựng tiếng Anh cơ bản về các loài động vật hoang dã và vật nuôi xung quanh chúng ta.",
    category: "Nature",
    language: "English",
    cards: [
      { term: "dog", definition: "con chó", pronunciation: "/dɒɡ/", example: "The friendly dog wagged its tail when seeing its owner." },
      { term: "cat", definition: "con mèo", pronunciation: "/kæt/", example: "The fluffy cat purred softly on the rug." },
      { term: "bird", definition: "con chim", pronunciation: "/bɜːd/", example: "A colorful bird perched on the wooden fence." },
      { term: "horse", definition: "con ngựa", pronunciation: "/hɔːs/", example: "The strong horse ran across the open meadow." },
      { term: "cow", definition: "con bò", pronunciation: "/kaʊ/", example: "Cows grazed quietly on green pasture grass." },
      { term: "pig", definition: "con lợn, con heo", pronunciation: "/pɪɡ/", example: "The farmer fed the hungry pig in the pen." },
      { term: "sheep", definition: "con cừu", pronunciation: "/ʃiːp/", example: "A flock of white sheep wandered along the hillside." },
      { term: "goat", definition: "con dê", pronunciation: "/ɡəʊt/", example: "The agile goat jumped easily onto high rocks." },
      { term: "duck", definition: "con vịt", pronunciation: "/dʌk/", example: "Ducks paddled across the calm village pond." },
      { term: "rabbit", definition: "con thỏ", pronunciation: "/ˈræbɪt/", example: "A wild rabbit nibbled on fresh green leaves." },
      { term: "mouse", definition: "con chuột", pronunciation: "/maʊs/", example: "A tiny mouse scurried behind the kitchen cabinet." },
      { term: "lion", definition: "sư tử", pronunciation: "/ˈlaɪən/", example: "The proud lion rested under the shade of an acacia tree." },
      { term: "tiger", definition: "con hổ", pronunciation: "/ˈtaɪɡər/", example: "The striped tiger stalked silently through the jungle." },
      { term: "elephant", definition: "con voi", pronunciation: "/ˈelɪfənt/", example: "The huge elephant sprayed water with its trunk." },
      { term: "monkey", definition: "con khỉ", pronunciation: "/ˈmʌŋki/", example: "A playful monkey peeled a banana up in the tree." },
      { term: "bear", definition: "con gấu", pronunciation: "/beər/", example: "The black bear hibernates during freezing winter months." },
      { term: "giraffe", definition: "hươu cao cổ", pronunciation: "/dʒəˈrɑːf/", example: "The tall giraffe reached tasty leaves at the top of the tree." },
      { term: "zebra", definition: "ngựa vằn", pronunciation: "/ˈzebrə/", example: "Zebras have distinctive black and white stripes." },
      { term: "dolphin", definition: "cá heo", pronunciation: "/ˈdɒlfɪn/", example: "Dolphins are known for their high intelligence and friendliness." },
      { term: "whale", definition: "cá voi", pronunciation: "/weɪl/", example: "The giant blue whale swam gracefully through deep ocean waters." },
    ],
  },
  {
    title: "Sports – Thể thao",
    description: "Học các từ vựng tiếng Anh cơ bản về các môn thể thao và hoạt động rèn luyện sức khỏe phổ biến.",
    category: "Sports",
    language: "English",
    cards: [
      { term: "football", definition: "môn bóng đá", pronunciation: "/ˈfʊtbɔːl/", example: "Millions of fans watch the football championship." },
      { term: "basketball", definition: "môn bóng rổ", pronunciation: "/ˈbɑːskɪtbɔːl/", example: "He dribbled past defenders to score in basketball." },
      { term: "volleyball", definition: "môn bóng chuyền", pronunciation: "/ˈvɒlibɔːl/", example: "Our team practiced volleyball serves for an hour." },
      { term: "tennis", definition: "môn quần vợt, tennis", pronunciation: "/ˈtenɪs/", example: "She served an ace during the tennis match." },
      { term: "badminton", definition: "môn cầu lông", pronunciation: "/ˈbædmɪntən/", example: "Hit the shuttlecock over the net in badminton." },
      { term: "swimming", definition: "môn bơi lội", pronunciation: "/ˈswɪmɪŋ/", example: "Daily swimming improves lung capacity and stamina." },
      { term: "running", definition: "môn chạy bộ", pronunciation: "/ˈrʌnɪŋ/", example: "He signed up for a morning running marathon." },
      { term: "cycling", definition: "môn đạp xe", pronunciation: "/ˈsaɪklɪŋ/", example: "Cycling to school is eco-friendly and healthy." },
      { term: "boxing", definition: "môn đấm bốc, quyền anh", pronunciation: "/ˈbɒksɪŋ/", example: "Heavyweight boxing requires power and discipline." },
      { term: "baseball", definition: "môn bóng chày", pronunciation: "/ˈbeɪsbɔːl/", example: "The batter hit a home run in yesterday's baseball game." },
      { term: "golf", definition: "môn chơi gôn", pronunciation: "/ɡɒlf/", example: "He swung his club smoothly on the golf course." },
      { term: "skiing", definition: "môn trượt tuyết", pronunciation: "/ˈskiːɪŋ/", example: "Skiing down snowy slopes is thrilling." },
      { term: "skating", definition: "môn trượt băng, trượt ván", pronunciation: "/ˈskeɪtɪŋ/", example: "She practiced figure skating routines at the rink." },
      { term: "surfing", definition: "môn lướt sóng", pronunciation: "/ˈsɜːfɪŋ/", example: "Surfing big waves requires strong physical balance." },
      { term: "wrestling", definition: "môn đấu vật", pronunciation: "/ˈreslɪŋ/", example: "Traditional wrestling demands strength and agility." },
      { term: "karate", definition: "môn võ karate", pronunciation: "/kəˈrɑːti/", example: "Students bow respectfully before each karate sparring session." },
      { term: "judo", definition: "môn võ judo", pronunciation: "/ˈdʒuːdəʊ/", example: "Judo focuses on balance, leverage, and throwing techniques." },
      { term: "table tennis", definition: "môn bóng bàn", pronunciation: "/ˈteɪbl ˈtenɪs/", example: "Quick reflexes make you a formidable table tennis player." },
      { term: "gymnastics", definition: "môn thể dục dụng cụ", pronunciation: "/dʒɪmˈnæstɪks/", example: "Gymnastics builds incredible balance and bodily flexibility." },
      { term: "archery", definition: "môn bắn cung", pronunciation: "/ˈɑːtʃəri/", example: "In archery, competitors shoot arrows at target centers." },
    ],
  },
  {
    title: "Music – Âm nhạc",
    description: "Học các từ vựng tiếng Anh cơ bản về âm nhạc, các loại nhạc cụ và hoạt động biểu diễn nghệ thuật.",
    category: "Arts & Culture",
    language: "English",
    cards: [
      { term: "music", definition: "âm nhạc", pronunciation: "/ˈmjuːzɪk/", example: "Soft music creates a calm and relaxing environment." },
      { term: "song", definition: "bài hát", pronunciation: "/sɒŋ/", example: "Everyone joined in singing the cheerful folk song." },
      { term: "singer", definition: "ca sĩ", pronunciation: "/ˈsɪŋər/", example: "The lead singer sang with deep passion." },
      { term: "band", definition: "ban nhạc", pronunciation: "/bænd/", example: "The rock band released their newest single." },
      { term: "guitar", definition: "đàn ghi-ta", pronunciation: "/ɡɪˈtɑːr/", example: "He learned to play acoustic guitar chords." },
      { term: "piano", definition: "đàn dương cầm, piano", pronunciation: "/piˈænəʊ/", example: "Classical piano music echoed throughout the hall." },
      { term: "violin", definition: "đàn vĩ cầm, vi-ô-lông", pronunciation: "/ˌvaɪəˈlɪn/", example: "The orchestra violin section performed brilliantly." },
      { term: "drum", definition: "cái trống", pronunciation: "/drʌm/", example: "He struck the drum with steady timing." },
      { term: "flute", definition: "cây sáo", pronunciation: "/fluːt/", example: "The sweet sound of a bamboo flute filled the air." },
      { term: "concert", definition: "buổi hòa nhạc, ca nhạc", pronunciation: "/ˈkɒnsət/", example: "Thousands of enthusiastic fans attended the live concert." },
      { term: "album", definition: "album âm nhạc", pronunciation: "/ˈælbəm/", example: "Their latest album reached number one on the charts." },
      { term: "melody", definition: "giai điệu", pronunciation: "/ˈmelədi/", example: "The memorable melody lingered in my mind." },
      { term: "rhythm", definition: "nhịp điệu, tiết tấu", pronunciation: "/ˈrɪðəm/", example: "Dancers moved naturally with the drum rhythm." },
      { term: "voice", definition: "giọng hát", pronunciation: "/vɔɪs/", example: "She trained her vocal chords to project a clear singing voice." },
      { term: "microphone", definition: "micrô", pronunciation: "/ˈmaɪkrəfəʊn/", example: "He adjusted the microphone before addressing the crowd." },
      { term: "keyboard", definition: "đàn phím điện tử", pronunciation: "/ˈkiːbɔːd/", example: "The musician arranged electronic sounds on his keyboard." },
      { term: "musician", definition: "nhạc sĩ, nghệ sĩ biểu diễn", pronunciation: "/mjuˈzɪʃn/", example: "A skilled musician practices daily to maintain dexterity." },
      { term: "instrument", definition: "nhạc cụ", pronunciation: "/ˈɪnstrəmənt/", example: "Each orchestral instrument contributes to the harmony." },
      { term: "dance", definition: "khiêu vũ, nhảy múa", pronunciation: "/dɑːns/", example: "Energetic music inspired everyone to dance." },
      { term: "performance", definition: "buổi biểu diễn", pronunciation: "/pəˈfɔːməns/", example: "The audience applauded after an inspiring musical performance." },
    ],
  },
];

async function seedVocabularySets() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
  });

  try {
    console.log("Connected to MySQL database:", process.env.DB_NAME);

    // 1. Locate a valid teacher or admin account for creator_id
    const [users] = await connection.execute(
      `SELECT user_id, username, role FROM users 
       WHERE username = 'teacher.demo' OR role = 'TEACHER' OR role = 'ADMIN'
       ORDER BY (username = 'teacher.demo') DESC, (role = 'TEACHER') DESC, user_id ASC
       LIMIT 1`
    );

    if (!users.length) {
      throw new Error("No active TEACHER or ADMIN user found to assign as creator.");
    }

    const creatorId = users[0].user_id;
    console.log(`Using creator: ${users[0].username} (ID: ${creatorId}, Role: ${users[0].role})`);

    let totalSetsCreated = 0;
    let totalCardsCreated = 0;
    let totalSetsSkipped = 0;
    let totalCardsSkipped = 0;

    for (const setData of VOCABULARY_STUDY_SETS) {
      // Check if Study Set already exists by exact title or base topic name
      const [existingSets] = await connection.execute(
        `SELECT set_id, title FROM study_sets WHERE title = ? LIMIT 1`,
        [setData.title]
      );

      let setId;
      if (existingSets.length > 0) {
        setId = existingSets[0].set_id;
        console.log(`Study Set đã tồn tại: "${setData.title}" (ID: ${setId}) -> Skipping creation, checking cards...`);
        totalSetsSkipped++;
      } else {
        const [insertResult] = await connection.execute(
          `INSERT INTO study_sets 
            (creator_id, title, description, category, language, visibility, status)
           VALUES (?, ?, ?, ?, ?, 'PUBLIC', 'ACTIVE')`,
          [creatorId, setData.title, setData.description, setData.category, setData.language]
        );
        setId = insertResult.insertId;
        console.log(`[SUCCESS] Created Study Set: "${setData.title}" (ID: ${setId})`);
        totalSetsCreated++;
      }

      // Check existing cards for this set
      const [existingCards] = await connection.execute(
        `SELECT card_id, term FROM cards WHERE set_id = ?`,
        [setId]
      );
      const existingTermSet = new Set(existingCards.map((c) => c.term.toLowerCase()));

      let currentPosition = 1;
      for (const card of setData.cards) {
        if (existingTermSet.has(card.term.toLowerCase())) {
          totalCardsSkipped++;
          currentPosition++;
          continue;
        }

        await connection.execute(
          `INSERT INTO cards 
            (set_id, term, definition, pronunciation, example, image_url, audio_url, position)
           VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)`,
          [
            setId,
            card.term,
            card.definition,
            card.pronunciation || null,
            card.example || null,
            currentPosition,
          ]
        );
        existingTermSet.add(card.term.toLowerCase());
        totalCardsCreated++;
        currentPosition++;
      }
    }

    console.log("\n================ SEED SUMMARY ================");
    console.log(`Study Sets created: ${totalSetsCreated}`);
    console.log(`Study Sets already existed: ${totalSetsSkipped}`);
    console.log(`Cards created: ${totalCardsCreated}`);
    console.log(`Cards already existed: ${totalCardsSkipped}`);
    console.log("==============================================\n");
  } catch (error) {
    console.error("Error during vocabulary seeding:", error);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seedVocabularySets();
}

module.exports = { seedVocabularySets, VOCABULARY_STUDY_SETS };
