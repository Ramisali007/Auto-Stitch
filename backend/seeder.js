const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Admin, BoutiqueOwner, Customer } = require('./models/User');
const Boutique = require('./models/Boutique');
const Product = require('./models/Product');

dotenv.config();

const DESIGNERS = [
  { name: 'Élan', email: 'elan@gmail.com', city: 'Lahore', category: 'Luxury Pret & Formals' },
  { name: 'Suffuse', email: 'suffuse@gmail.com', city: 'Lahore', category: 'Bridal & Heavy Formals' },
  { name: 'Khaadi', email: 'khaadi@gmail.com', city: 'Karachi', category: 'Casual & Daily Wear' },
  { name: 'Maria.B', email: 'mariab@gmail.com', city: 'Lahore', category: 'Bridal & Trousseau' },
  { name: 'Sana Safinaz', email: 'sanasafinaz@gmail.com', city: 'Karachi', category: 'Luxury Pret' },
  { name: 'Ideas', email: 'ideas@gmail.com', city: 'Karachi', category: 'Casual & Home' },
  { name: 'J.', email: 'jdot@gmail.com', city: 'Karachi', category: 'Traditional Wear' },
  { name: 'Nishat Linen', email: 'nishatlinen@gmail.com', city: 'Lahore', category: 'Lawn & Pret' },
  { name: 'Agha Noor', email: 'aghanoor@gmail.com', city: 'Karachi', category: 'Party Wear' },
  { name: 'Asim Jofa', email: 'asimjofa@gmail.com', city: 'Karachi', category: 'Luxury Formals' }
];

const MOCK_PRODUCTS = [
  // Élan Editorial Collection (12 items)
  { name: 'ZINNIA COTTON KURTA', description: 'A delicate cotton kurta with intricate zinnia floral embroidery.', price: 15400, images: ['/Photos/elan/pexels-dhanno-18862319.jpg'], category: 'Luxury Pret', material: 'Cotton', boutiqueName: 'Élan' },
  { name: 'AZURE SILK SHIRT', description: 'Rich azure blue silk shirt with a modern silhouette.', price: 18000, images: ['/Photos/elan/pexels-dhanno-18862631.jpg'], category: 'Luxury Pret', material: 'Silk', boutiqueName: 'Élan' },
  { name: 'IVORY CHIFFON SUIT', description: 'Elegant ivory chiffon suit perfect for formal gatherings.', price: 25000, images: ['/Photos/elan/pexels-dhanno-18976989.jpg'], category: 'Formal', material: 'Chiffon', boutiqueName: 'Élan' },
  { name: 'ROUGE VELVET KAFTAN', description: 'Deep rouge velvet kaftan with gold thread work.', price: 22000, images: ['/Photos/elan/pexels-dhanno-18977034.jpg'], category: 'Formal', material: 'Velvet', boutiqueName: 'Élan' },
  { name: 'MIDNIGHT SATIN GOWN', description: 'Floor-length midnight satin gown for evening events.', price: 32000, images: ['/Photos/elan/pexels-dhanno-19221260.jpg'], category: 'Formal', material: 'Satin', boutiqueName: 'Élan' },
  { name: 'FLORAL ORGANZA WRAP', description: 'Sheer organza wrap with hand-painted floral motifs.', price: 12500, images: ['/Photos/elan/pexels-dhanno-19248024.jpg'], category: 'Luxury Pret', material: 'Organza', boutiqueName: 'Élan' },
  { name: 'EBONY EMBROIDERED SET', description: 'Black embroidered set with detailed neckline.', price: 28000, images: ['/Photos/elan/pexels-dhanno-19281279.jpg'], category: 'Formal', material: 'Cotton Silk', boutiqueName: 'Élan' },
  { name: 'PEARL BLOSSOM KURTA', price: 14500, description: 'Soft pink kurta with pearl embellishments.', images: ['/Photos/elan/pexels-dhanno-19401634.jpg'], category: 'Luxury Pret', material: 'Lawn', boutiqueName: 'Élan' },
  { name: 'AMETHYST LUXE SHIRT', price: 19800, description: 'Purple luxury shirt with a contemporary cut.', images: ['/Photos/elan/pexels-dhanno-19733567.jpg'], category: 'Luxury Pret', material: 'Silk', boutiqueName: 'Élan' },
  { name: 'SAFFRON SILK DRAPE', price: 21000, description: 'Bright saffron silk drape with traditional patterns.', images: ['/Photos/elan/pexels-dhanno-19956008.jpg'], category: 'Formal', material: 'Silk', boutiqueName: 'Élan' },
  { name: 'CELESTIAL BLUE PRETS', price: 17500, description: 'Light blue pret wear with subtle lace details.', images: ['/Photos/elan/pexels-dhanno-20420559.jpg'], category: 'Luxury Pret', material: 'Cotton', boutiqueName: 'Élan' },
  { name: 'EMERALD TRADITIONAL', price: 24000, description: 'Deep emerald green traditional attire.', images: ['/Photos/elan/pexels-dhanno-20527761.jpg'], category: 'Formal', material: 'Raw Silk', boutiqueName: 'Élan' },
  
  // Others
  { name: 'Zari Embroidered Lehenga', description: 'Stunning bridal wear.', price: 85000, images: ['/Photos/elan/pexels-dhanno-18976989.jpg'], category: 'Bridal', material: 'Net', boutiqueName: 'Maria.B' },
  { name: 'Floral Lawn Collection', description: 'Summer breeze lawn suit.', price: 5500, images: ['/Photos/elan/pexels-dhanno-18977034.jpg'], category: 'Luxury Pret', material: 'Lawn', boutiqueName: 'Khaadi' }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected...');

    await Product.deleteMany();
    await Boutique.deleteMany();
    await Admin.deleteMany();
    await BoutiqueOwner.deleteMany();
    await Customer.deleteMany();

    // 1. Create Admin
    await Admin.create({ 
      name: 'Auto Stitch Admin', 
      email: 'autostitchsecurity@gmail.com', 
      password: 'autostitch12345', 
      role: 'admin',
      isVerified: true
    });

    // 2. Create Designers/Boutiques
    for (const d of DESIGNERS) {
      const owner = await BoutiqueOwner.create({
        name: d.name,
        email: d.email,
        password: 'autostitch12345',
        role: 'boutique_owner',
        isVerified: true
      });

      await Boutique.create({
        owner: owner._id,
        name: d.name,
        description: `Official flagship store of ${d.name} on Auto Stitch. Offering the latest ${d.category} collections.`,
        isApproved: true,
        reputationScore: 4.5 + Math.random() * 0.5,
        address: { city: d.city },
        category: [d.category.split(' & ')[0]],
        kyc: { status: 'verified' }
      });
    }

    // 3. Create Customers
    const MOCK_CUSTOMERS = [
      { name: 'Ayesha Khan', email: 'ayesha@gmail.com', phone: '03001234567' },
      { name: 'Fatima Shah', email: 'fatima@gmail.com', phone: '03217654321' },
      { name: 'Zainab Malik', email: 'zainab@gmail.com', phone: '03339876543' },
      { name: 'Sara Ahmed', email: 'sara@gmail.com', phone: '03124567890' },
      { name: 'Amna Raza', email: 'amna@gmail.com', phone: '03451239876' }
    ];

    for (const c of MOCK_CUSTOMERS) {
      await Customer.create({
        ...c,
        password: 'autostitch12345',
        role: 'customer',
        isVerified: true,
        address: { street: 'Street 1', city: 'Lahore', province: 'Punjab' }
      });
    }

    // 4. Create Products (12 for each boutique)
    const PRODUCT_TYPES = ['Kurta', 'Silk Shirt', 'Formal Suit', 'Luxury Pret', 'Bridal Wear', 'Casual Tunic', 'Evening Gown', 'Festive Drape', 'Signature Set', 'Traditional Attire', 'Modern Fusion', 'Velvet Kaftan'];
    const MATERIALS = ['Silk', 'Cotton', 'Chiffon', 'Velvet', 'Organza', 'Lawn', 'Raw Silk', 'Net'];
    const ELAN_IMAGES = [
      '/Photos/elan/pexels-dhanno-18862319.jpg', '/Photos/elan/pexels-dhanno-18862631.jpg',
      '/Photos/elan/pexels-dhanno-18976989.jpg', '/Photos/elan/pexels-dhanno-18977034.jpg',
      '/Photos/elan/pexels-dhanno-19221260.jpg', '/Photos/elan/pexels-dhanno-19248024.jpg',
      '/Photos/elan/pexels-dhanno-19281279.jpg', '/Photos/elan/pexels-dhanno-19401634.jpg',
      '/Photos/elan/pexels-dhanno-19733567.jpg', '/Photos/elan/pexels-dhanno-19956008.jpg',
      '/Photos/elan/pexels-dhanno-20420559.jpg', '/Photos/elan/pexels-dhanno-20527761.jpg'
    ];

    for (const d of DESIGNERS) {
      const boutique = await Boutique.findOne({ name: d.name });
      if (boutique) {
        for (let i = 0; i < 12; i++) {
          const type = PRODUCT_TYPES[i % PRODUCT_TYPES.length];
          const mat = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
          
          await Product.create({
            boutique: boutique._id,
            name: `${d.name.toUpperCase()} ${type.toUpperCase()}`,
            description: `A masterfully crafted ${type} by ${d.name}. Featuring premium ${mat} fabric with exquisite artisanal details from our latest seasonal collection.`,
            price: 15000 + (Math.floor(Math.random() * 20) * 1000),
            images: [ELAN_IMAGES[i % ELAN_IMAGES.length]],
            category: boutique.category[0] || 'Luxury Pret',
            material: mat,
            sizes: ['S', 'M', 'L', 'XL'],
            colors: ['Original', 'Midnight Blue', 'Emerald', 'Rose Gold'],
            stock: 25,
            status: 'approved',
            isActive: true
          });
        }
      }
    }

    console.log('🌟 Real Designer Data Imported Successfully!');
    process.exit();
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedData();
