
/* ==========================================
   GOTHIC STORE - PART 3
   CORE / PRODUCTS / CART
========================================== */

const DATABASE_URL =
  "https://zzzzz-12-default-rtdb.firebaseio.com/";

const STORE_KEY = "gothic_store_data_v1";

const DEFAULT_DATA = {
  settings: {
    name: "Gothic Store",
    description: "Welcome to our little dark paradise ♡",
    marquee: "✦ WELCOME TO OUR STORE ✦ THANK YOU FOR VISITING ✦",
    profile: "",
    banner: "",
    theme: "darkPurple",
    colors: {}
  },
  products: [],
  reviews: [],
  stories: [],
  payment: {
    qr: "",
    owner: "",
    slip: "กรุณาแจ้งชื่อผู้สั่งซื้อพร้อมแนบสลิปการโอนเงิน"
  },
  banks: [],
  contacts: []
};

let storeData = loadStoreData();
let cart = [];
let selectedProduct = null;
let selectedRating = 5;
let selectedTag = "all";
let currentStory = null;
let storyIndex = 0;
let storyTimer = null;
let storyStart = 0;
let currentTheme = "darkPurple";

/* ---------- DATA ---------- */

function loadStoreData() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (!saved) return structuredClone(DEFAULT_DATA);

    const parsed = JSON.parse(saved);

    return {
      ...structuredClone(DEFAULT_DATA),
      ...parsed,
      settings: {
        ...DEFAULT_DATA.settings,
        ...(parsed.settings || {})
      },
      payment: {
        ...DEFAULT_DATA.payment,
        ...(parsed.payment || {})
      },
      products: Array.isArray(parsed.products) ? parsed.products : [],
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      stories: Array.isArray(parsed.stories) ? parsed.stories : [],
      banks: Array.isArray(parsed.banks) ? parsed.banks : [],
      contacts: Array.isArray(parsed.contacts) ? parsed.contacts : []
    };
  } catch (error) {
    console.error(error);
    return structuredClone(DEFAULT_DATA);
  }
}

function saveStoreData() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(storeData));
    return true;
  } catch (error) {
    console.error("Storage error:", error);
    showToast("ข้อมูลมีขนาดใหญ่เกินพื้นที่จัดเก็บ");
    return false;
  }
}

function makeId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
}

function formatMoney(number) {
  return Number(number || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function placeholderImage() {
  return "data:image/svg+xml," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
      <rect width="100%" height="100%" fill="#25172f"/>
      <text x="50%" y="48%" text-anchor="middle"
        fill="#bd8be8" font-size="65">♱</text>
      <text x="50%" y="65%" text-anchor="middle"
        fill="#b9a8c7" font-size="18">GOTHIC STORE</text>
    </svg>
  `);
}

function getProductImage(product) {
  return product.image || placeholderImage();
}

/* ---------- NAVIGATION ---------- */

function switchPage(pageId, button) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  if (button) button.classList.add("active");

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (pageId === "reviewsPage") renderReviews();
  if (pageId === "paymentPage") renderPayment();
  if (pageId === "contactPage") renderContacts();
}

/* ---------- MODALS ---------- */

function openModal(id) {
  document.getElementById(id)?.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("show");

  if (!document.querySelector(".modal.show")) {
    document.body.style.overflow = "";
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

/* ---------- PRODUCTS ---------- */

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const search = document.getElementById("productSearch").value
    .trim().toLowerCase();

  const sort = document.getElementById("productSort").value;

  let products = [...storeData.products];

  if (search) {
    products = products.filter(product => {
      const content = [
        product.name,
        product.description,
        ...(product.tags || [])
      ].join(" ").toLowerCase();

      return content.includes(search);
    });
  }

  if (selectedTag !== "all") {
    products = products.filter(product =>
      (product.tags || []).includes(selectedTag)
    );
  }

  if (sort === "priceLow") {
    products.sort((a,b) => Number(a.price) - Number(b.price));
  }

  if (sort === "priceHigh") {
    products.sort((a,b) => Number(b.price) - Number(a.price));
  }

  if (sort === "newest") {
    products.sort((a,b) => Number(b.createdAt || 0) -
      Number(a.createdAt || 0));
  }

  if (sort === "popular") {
    products.sort((a,b) => Number(b.sales || 0) -
      Number(a.sales || 0));
  }

  document.getElementById("productTotal").textContent =
    products.length + " ITEMS";

  document.getElementById("emptyProducts").hidden =
    products.length !== 0;

  grid.innerHTML = products.map(product => {
    const badges = (product.badges || []).map(badge =>
      `<span class="product-badge">${escapeHTML(badge)}</span>`
    ).join("");

    const tags = (product.tags || []).slice(0,3).map(tag =>
      `<span>#${escapeHTML(tag)}</span>`
    ).join("");

    const link = product.link
      ? `<a class="product-link-circle"
          href="${escapeHTML(product.link)}"
          target="_blank" rel="noopener"
          onclick="event.stopPropagation()">
          <i class="fa-solid fa-link"></i>
        </a>`
      : "";

    return `
      <article class="product-card">
        <div class="product-image-box"
          onclick="openProduct('${product.id}')">

          <img src="${getProductImage(product)}"
            alt="${escapeHTML(product.name)}"
            loading="lazy">

          <div class="product-badges">${badges}</div>
          ${link}
        </div>

        <div class="product-info">
          <h3>${escapeHTML(product.name)}</h3>

          <div class="product-price">
            ฿${formatMoney(product.price)}
          </div>

          <div class="product-tags">${tags}</div>

          <button class="product-add-btn"
            onclick="addToCart('${product.id}')">
            <i class="fa-solid fa-cart-plus"></i>
            เพิ่มลงตะกร้า
          </button>
        </div>
      </article>
    `;
  }).join("");

  renderTagFilters();
}

function renderTagFilters() {
  const allTags = [...new Set(
    storeData.products.flatMap(product => product.tags || [])
  )];

  const container = document.getElementById("tagFilter");

  container.innerHTML = `
    <button class="tag-chip ${selectedTag === "all" ? "active" : ""}"
      onclick="filterTag('all',this)">ทั้งหมด</button>
    ${allTags.map(tag => `
      <button class="tag-chip ${selectedTag === tag ? "active" : ""}"
        onclick="filterTag('${escapeHTML(tag)}',this)">
        ${escapeHTML(tag)}
      </button>
    `).join("")}
  `;
}

function filterTag(tag) {
  selectedTag = tag;
  renderProducts();
}

function openProduct(id) {
  const product = storeData.products.find(item => item.id === id);
  if (!product) return;

  selectedProduct = product;

  document.getElementById("detailName").textContent = product.name;
  document.getElementById("detailPrice").textContent =
    "฿" + formatMoney(product.price);

  document.getElementById("detailDescription").textContent =
    product.description || "ไม่มีรายละเอียดสินค้า";

  document.getElementById("detailMainImage").src =
    getProductImage(product);

  document.getElementById("detailBadges").innerHTML =
    (product.badges || []).map(badge =>
      `<span class="product-badge">${escapeHTML(badge)}</span>`
    ).join("");

  document.getElementById("detailTags").innerHTML =
    (product.tags || []).map(tag =>
      `<span class="tag-chip">#${escapeHTML(tag)}</span>`
    ).join("");

  const gallery = [
    product.image,
    ...(product.gallery || [])
  ].filter(Boolean);

  document.getElementById("detailThumbnails").innerHTML =
    gallery.map(image => `
      <img src="${image}"
        onclick="changeDetailImage(this.src)">
    `).join("");

  const link = document.getElementById("detailExternalLink");

  if (product.link) {
    link.href = product.link;
    link.hidden = false;
  } else {
    link.hidden = true;
    link.removeAttribute("href");
  }

  document.getElementById("detailAddButton").onclick = () => {
    addToCart(product.id);
  };

  openModal("productModal");
}

function changeDetailImage(src) {
  document.getElementById("detailMainImage").src = src;
}

/* ---------- CART ---------- */

function addToCart(productId) {
  const product = storeData.products.find(p => p.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: getProductImage(product),
      quantity: 1
    });
  }

  renderCart();
  showToast("เพิ่มสินค้าลงตะกร้าแล้ว ♡");
}

function changeQuantity(id, amount) {
  const item = cart.find(p => p.id === id);
  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(p => p.id !== id);
  }

  renderCart();
}

function getCartTotal() {
  return cart.reduce((sum,item) =>
    sum + item.price * item.quantity, 0
  );
}

function renderCart() {
  document.getElementById("cartCount").textContent =
    cart.reduce((sum,item) => sum + item.quantity, 0);

  const container = document.getElementById("cartItems");

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span>♡</span>
        <h3>ตะกร้ายังว่างอยู่</h3>
        <p>เลือกสินค้าที่คุณชอบได้เลย</p>
      </div>
    `;
  } else {
    container.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="">

        <div class="cart-item-info">
          <h4>${escapeHTML(item.name)}</h4>
          <p>฿${formatMoney(item.price)}</p>

          <div class="quantity-control">
            <button onclick="changeQuantity('${item.id}',-1)">−</button>
            <span>${item.quantity}</span>
            <button onclick="changeQuantity('${item.id}',1)">+</button>
          </div>
        </div>

        <strong>฿${formatMoney(item.price * item.quantity)}</strong>
      </div>
    `).join("");
  }

  document.getElementById("cartTotal").textContent =
    "฿" + formatMoney(getCartTotal());
}

function openCart() {
  renderCart();
  openModal("cartModal");
}

/* ---------- PRODUCT ADMIN FORM ---------- */

async function fileToDataURL(file) {
  if (!file) return "";

  if (!file.type.startsWith("image/")) {
    throw new Error("ไฟล์ต้องเป็นรูปภาพ");
  }

  if (file.size > 3 * 1024 * 1024) {
    throw new Error("รูปภาพต้องมีขนาดไม่เกิน 3 MB");
  }

  return new Promise((resolve,reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));

    reader.readAsDataURL(file);
  });
}

async function saveProduct(event) {
  event.preventDefault();

  const id = document.getElementById("editProductId").value;
  const oldProduct = storeData.products.find(p => p.id === id);

  try {
    const mainFile = document.getElementById("inputProductImage").files[0];

    const galleryFiles = [
      ...document.getElementById("inputProductGallery").files
    ];

    const mainImage = mainFile
      ? await fileToDataURL(mainFile)
      : oldProduct?.image || "";

    const extraImages = await Promise.all(
      galleryFiles.map(fileToDataURL)
    );

    const badges = [
      ...document.querySelectorAll('input[name="productBadge"]:checked')
    ].map(input => input.value);

    const product = {
      id: id || makeId(),
      name: document.getElementById("inputProductName").value.trim(),
      price: Number(document.getElementById("inputProductPrice").value),
      image: mainImage,
      gallery: extraImages.length
        ? extraImages
        : (oldProduct?.gallery || []),
      description: document.getElementById("inputProductDescription").value,
      badges,
      tags: document.getElementById("inputProductTags").value
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean),
      link: document.getElementById("inputProductLink").value.trim(),
      sales: oldProduct?.sales || 0,
      createdAt: oldProduct?.createdAt || Date.now()
    };

    if (!product.name || !Number.isFinite(product.price) ||
        product.price < 0) {
      showToast("กรุณาตรวจสอบชื่อและราคาสินค้า");
      return;
    }

    if (id) {
      storeData.products = storeData.products.map(p =>
        p.id === id ? product : p
      );
    } else {
      storeData.products.push(product);
    }

    if (!saveStoreData()) return;

    resetProductForm();
    renderProducts();
    renderAdminProducts();
    showToast("บันทึกสินค้าเรียบร้อย ♡");

  } catch (error) {
    showToast(error.message || "ไม่สามารถบันทึกสินค้าได้");
  }
}

function resetProductForm() {
  document.getElementById("productForm").reset();
  document.getElementById("editProductId").value = "";
}

function editProduct(id) {
  const product = storeData.products.find(p => p.id === id);
  if (!product) return;

  document.getElementById("editProductId").value = product.id;
  document.getElementById("inputProductName").value = product.name;
  document.getElementById("inputProductPrice").value = product.price;
  document.getElementById("inputProductDescription").value =
    product.description || "";
  document.getElementById("inputProductTags").value =
    (product.tags || []).join(", ");
  document.getElementById("inputProductLink").value = product.link || "";

  document.querySelectorAll('input[name="productBadge"]').forEach(input => {
    input.checked = (product.badges || []).includes(input.value);
  });

  showAdminTab("adminProducts");
  showToast("กำลังแก้ไขสินค้า");
}

function deleteProduct(id) {
  if (!confirm("ต้องการลบสินค้านี้หรือไม่?")) return;

  storeData.products = storeData.products.filter(p => p.id !== id);

  saveStoreData();
  renderProducts();
  renderAdminProducts();
  showToast("ลบสินค้าแล้ว");
}

function moveProduct(id, direction) {
  const index = storeData.products.findIndex(p => p.id === id);
  if (index < 0) return;

  const target = index + direction;
  if (target < 0 || target >= storeData.products.length) return;

  const list = storeData.products;
  [list[index],list[target]] = [list[target],list[index]];

  saveStoreData();
  renderProducts();
  renderAdminProducts();
    }
                                  
/* ==========================================
   GOTHIC STORE - PART 4
   REVIEWS / STORIES / RECEIPTS
========================================== */

/* ---------- REVIEWS ---------- */

function renderReviews() {
  const list = document.getElementById("reviewList");

  const reviews = [...storeData.reviews].sort(
    (a,b) => Number(b.createdAt) - Number(a.createdAt)
  );

  const total = reviews.length;

  const average = total
    ? reviews.reduce((sum,r) => sum + Number(r.rating || 0),0) / total
    : 0;

  document.getElementById("reviewCount").textContent = total;
  document.getElementById("averageRating").textContent =
    average.toFixed(1);

  list.innerHTML = reviews.map(review => `
    <article class="review-card">
      <div class="review-user">
        <div class="review-avatar">
          ${escapeHTML((review.name || "?").charAt(0))}
        </div>

        <div>
          <strong>${escapeHTML(review.name)}</strong>
          <div class="review-stars">
            ${"★".repeat(Number(review.rating || 0))}
            ${"☆".repeat(5 - Number(review.rating || 0))}
          </div>
        </div>
      </div>

      <p class="review-text">${escapeHTML(review.text)}</p>

      <div class="review-images">
        ${(review.images || []).map(image => `
          <img src="${image}" loading="lazy" alt="Review image"
            onclick="window.open(this.src,'_blank')">
        `).join("")}
      </div>

      <small style="color:var(--muted);font-size:10px">
        ${new Date(review.createdAt).toLocaleDateString("th-TH")}
      </small>
    </article>
  `).join("");
}

/* Rating */

function setRating(value) {
  selectedRating = value;

  document.querySelectorAll("#ratingInput button").forEach((button,index) => {
    button.classList.toggle("active",index < value);
  });
}

/* Review file preview */

document.getElementById("reviewFiles").addEventListener("change", async event => {
  const preview = document.getElementById("reviewPreview");
  preview.innerHTML = "";

  const files = [...event.target.files];

  if (files.length > 8) {
    showToast("แนบรูปได้ไม่เกิน 8 รูป");
    event.target.value = "";
    return;
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    if (file.size > 3 * 1024 * 1024) {
      showToast("รูปภาพต้องไม่เกิน 3 MB");
      continue;
    }

    const url = await fileToDataURL(file);

    const img = document.createElement("img");
    img.src = url;
    preview.appendChild(img);
  }
});

function openReviewModal() {
  selectedRating = 5;
  setRating(5);
  document.getElementById("reviewForm").reset();
  document.getElementById("reviewPreview").innerHTML = "";
  openModal("reviewModal");
}

async function submitReview(event) {
  event.preventDefault();

  const name = document.getElementById("reviewerName").value.trim();
  const reviewText = document.getElementById("reviewText").value.trim();
  const files = [...document.getElementById("reviewFiles").files];

  if (!name || !reviewText) return;

  if (files.length > 8) {
    showToast("แนบรูปได้ไม่เกิน 8 รูป");
    return;
  }

  try {
    const images = await Promise.all(
      files.map(fileToDataURL)
    );

    const review = {
      id: makeId(),
      name,
      rating: selectedRating,
      text: reviewText,
      images,
      createdAt: Date.now()
    };

    storeData.reviews.push(review);

    if (!saveStoreData()) {
      storeData.reviews.pop();
      return;
    }

    closeModal("reviewModal");
    renderReviews();

    showToast("ขอบคุณสำหรับรีวิว ♡");

  } catch (error) {
    showToast(error.message || "ส่งรีวิวไม่สำเร็จ");
  }
}

/* ---------- ADMIN REVIEW MANAGEMENT ---------- */

function renderAdminReviews() {
  const container = document.getElementById("adminReviewList");

  container.innerHTML = storeData.reviews.map(review => `
    <div class="admin-list-item">
      <div>
        <strong>${escapeHTML(review.name)}</strong>
        <p>${"★".repeat(review.rating)} ${escapeHTML(review.text)}</p>
      </div>

      <div class="admin-list-actions">
        <button class="delete-btn"
          onclick="deleteReview('${review.id}')">
          ลบ
        </button>
      </div>
    </div>
  `).join("");
}

function deleteReview(id) {
  if (!requireAdmin()) return;

  if (!confirm("ต้องการลบรีวิวนี้หรือไม่?")) return;

  storeData.reviews = storeData.reviews.filter(r => r.id !== id);

  saveStoreData();
  renderReviews();
  renderAdminReviews();

  showToast("ลบรีวิวเรียบร้อย");
}

/* ---------- STORIES ---------- */

function renderStories() {
  const list = document.getElementById("storyList");

  list.innerHTML = storeData.stories.map(story => `
    <div class="story-item" onclick="openStory('${story.id}')">
      <div class="story-cover">
        <img src="${story.cover || placeholderImage()}" alt="">
      </div>
      <span>${escapeHTML(story.title)}</span>
    </div>
  `).join("");
}

function openStory(id) {
  const story = storeData.stories.find(s => s.id === id);
  if (!story || !story.images?.length) return;

  currentStory = story;
  storyIndex = 0;

  openModal("storyModal");
  showStoryImage();
}

function showStoryImage() {
  if (!currentStory) return;

  clearTimeout(storyTimer);

  const images = currentStory.images;

  if (storyIndex >= images.length) {
    closeStory();
    return;
  }

  document.getElementById("storyImage").src = images[storyIndex];

  document.getElementById("storyCaption").textContent =
    currentStory.title;

  const progress = document.getElementById("storyProgress");

  progress.classList.remove("running");
  void progress.offsetWidth;
  progress.classList.add("running");

  storyStart = Date.now();

  storyTimer = setTimeout(() => {
    nextStory();
  },6000);
}

function nextStory() {
  if (!currentStory) return;

  storyIndex++;
  showStoryImage();
}

function previousStory() {
  if (!currentStory) return;

  storyIndex = Math.max(0,storyIndex - 1);
  showStoryImage();
}

function closeStory() {
  clearTimeout(storyTimer);
  currentStory = null;
  closeModal("storyModal");
}

/* ---------- ADMIN STORY MANAGEMENT ---------- */

async function saveStory(event) {
  event.preventDefault();

  if (!requireAdmin()) return;

  const id = document.getElementById("editStoryId").value;

  const oldStory = storeData.stories.find(s => s.id === id);

  try {
    const coverFile = document.getElementById("storyCover").files[0];

    const files = [
      ...document.getElementById("storyFiles").files
    ];

    const cover = coverFile
      ? await fileToDataURL(coverFile)
      : oldStory?.cover || "";

    const newImages = await Promise.all(
      files.map(fileToDataURL)
    );

    const story = {
      id: id || makeId(),
      title: document.getElementById("storyTitle").value.trim(),
      cover,
      images: newImages.length
        ? newImages
        : (oldStory?.images || [])
    };

    if (!story.title || !story.images.length) {
      showToast("กรุณากรอกชื่อและเพิ่มรูปสตอรี่");
      return;
    }

    if (id) {
      storeData.stories = storeData.stories.map(s =>
        s.id === id ? story : s
      );
    } else {
      storeData.stories.push(story);
    }

    if (!saveStoreData()) return;

    document.getElementById("storyForm").reset();
    document.getElementById("editStoryId").value = "";

    renderStories();
    renderAdminStories();

    showToast("บันทึกไฮไลท์แล้ว ♡");

  } catch (error) {
    showToast(error.message || "บันทึกไม่สำเร็จ");
  }
}

function renderAdminStories() {
  const container = document.getElementById("adminStoryList");

  container.innerHTML = storeData.stories.map(story => `
    <div class="admin-list-item">
      <img src="${story.cover || placeholderImage()}" alt="">

      <strong>${escapeHTML(story.title)}</strong>

      <div class="admin-list-actions">
        <button onclick="editStory('${story.id}')">แก้ไข</button>
        <button class="delete-btn"
          onclick="deleteStory('${story.id}')">ลบ</button>
      </div>
    </div>
  `).join("");
}

function editStory(id) {
  if (!requireAdmin()) return;

  const story = storeData.stories.find(s => s.id === id);
  if (!story) return;

  document.getElementById("editStoryId").value = id;
  document.getElementById("storyTitle").value = story.title;

  showToast("เลือกไฟล์ใหม่เพื่อเปลี่ยนรูป หรือไม่เลือกเพื่อใช้รูปเดิม");
}

function deleteStory(id) {
  if (!requireAdmin()) return;

  if (!confirm("ลบไฮไลท์นี้หรือไม่?")) return;

  storeData.stories = storeData.stories.filter(s => s.id !== id);

  saveStoreData();
  renderStories();
  renderAdminStories();

  showToast("ลบไฮไลท์แล้ว");
}

/* ---------- RECEIPTS ---------- */

function generateReceipt() {
  if (!cart.length) {
    showToast("กรุณาเพิ่มสินค้าก่อน");
    return;
  }

  const customer = document.getElementById("customerName")
    .value.trim();

  if (!customer) {
    showToast("กรุณากรอกชื่อลูกค้า");
    document.getElementById("customerName").focus();
    return;
  }

  const receiptId = "JR-" + Date.now().toString().slice(-8);

  const now = new Date();

  document.getElementById("receiptStoreName").textContent =
    storeData.settings.name;

  document.getElementById("receiptStoreDescription").textContent =
    storeData.settings.description;

  document.getElementById("receiptNumber").textContent = receiptId;

  document.getElementById("receiptDate").textContent =
    now.toLocaleString("th-TH");

  document.getElementById("receiptCustomer").textContent = customer;

  document.getElementById("receiptProducts").innerHTML =
    cart.map(item => `
      <div class="receipt-product-row">
        <span>${escapeHTML(item.name)} × ${item.quantity}</span>
        <strong>฿${formatMoney(item.price * item.quantity)}</strong>
      </div>
    `).join("");

  document.getElementById("receiptTotal").textContent =
    "฿" + formatMoney(getCartTotal());

  closeModal("cartModal");
  openModal("receiptModal");

  showToast("สร้างใบเสร็จเรียบร้อย");
}

async function downloadReceipt() {
  const receipt = document.getElementById("receiptPaper");

  if (!window.html2canvas) {
    showToast("ไม่สามารถโหลดระบบสร้างภาพได้");
    return;
  }

  try {
    const canvas = await html2canvas(receipt,{
      scale: 2,
      backgroundColor: "#fffaf6",
      useCORS: true
    });

    const link = document.createElement("a");

    link.download = "Gothic-Receipt-" +
      Date.now() + ".jpeg";

    link.href = canvas.toDataURL("image/jpeg",0.95);
    link.click();

    cart = [];
    document.getElementById("customerName").value = "";

    renderCart();

    closeModal("receiptModal");

    showToast("บันทึกใบเสร็จและล้างตะกร้าแล้ว ♡");

  } catch (error) {
    console.error(error);
    showToast("สร้างรูปใบเสร็จไม่สำเร็จ");
  }
}
  
/* ==========================================
   GOTHIC STORE - PART 5
   PAYMENT / CONTACT / THEMES / ADMIN
========================================== */

/* ---------- PAYMENT ---------- */

function renderPayment() {
  const payment = storeData.payment;

  document.getElementById("paymentQR").src =
    payment.qr || placeholderImage();

  document.getElementById("accountOwner").textContent =
    payment.owner || "ยังไม่ได้กำหนดชื่อบัญชี";

  document.getElementById("slipMessage").textContent =
    payment.slip || "";

  document.getElementById("bankList").innerHTML =
    storeData.banks.map(bank => `
      <div class="bank-card">
        <h4>${escapeHTML(bank.english)}</h4>
        <p>${escapeHTML(bank.thai)}</p>

        <div class="bank-number">
          ${escapeHTML(bank.number)}
        </div>

        <button class="bank-copy"
          onclick="copyValue('${escapeHTML(bank.number)}')">
          <i class="fa-regular fa-copy"></i> คัดลอก
        </button>
      </div>
    `).join("");
}

async function savePayment(event) {
  event.preventDefault();

  if (!requireAdmin()) return;

  try {
    const file = document.getElementById("inputQR").files[0];

    if (file) {
      storeData.payment.qr = await fileToDataURL(file);
    }

    storeData.payment.owner =
      document.getElementById("inputAccountOwner").value.trim();

    storeData.payment.slip =
      document.getElementById("inputSlipMessage").value.trim();

    saveStoreData();
    renderPayment();

    showToast("บันทึกช่องทางชำระเงินแล้ว");

  } catch (error) {
    showToast(error.message);
  }
}

async function saveBank(event) {
  event.preventDefault();

  if (!requireAdmin()) return;

  const id = document.getElementById("editBankId").value;

  const bank = {
    id: id || makeId(),
    english: document.getElementById("bankEnglish").value.trim(),
    thai: document.getElementById("bankThai").value.trim(),
    number: document.getElementById("bankNumber").value.trim()
  };

  if (id) {
    storeData.banks = storeData.banks.map(item =>
      item.id === id ? bank : item
    );
  } else {
    storeData.banks.push(bank);
  }

  saveStoreData();

  event.target.reset();
  document.getElementById("editBankId").value = "";

  renderPayment();
  renderAdminBanks();

  showToast("บันทึกบัญชีแล้ว");
}

function renderAdminBanks() {
  document.getElementById("adminBankList").innerHTML =
    storeData.banks.map(bank => `
      <div class="admin-list-item">
        <div>
          <strong>${escapeHTML(bank.english)}</strong>
          <p>${escapeHTML(bank.number)}</p>
        </div>

        <div class="admin-list-actions">
          <button onclick="editBank('${bank.id}')">แก้ไข</button>
          <button class="delete-btn"
            onclick="deleteBank('${bank.id}')">ลบ</button>
        </div>
      </div>
    `).join("");
}

function editBank(id) {
  if (!requireAdmin()) return;

  const bank = storeData.banks.find(item => item.id === id);
  if (!bank) return;

  document.getElementById("editBankId").value = id;
  document.getElementById("bankEnglish").value = bank.english;
  document.getElementById("bankThai").value = bank.thai;
  document.getElementById("bankNumber").value = bank.number;
}

function deleteBank(id) {
  if (!requireAdmin()) return;
  if (!confirm("ลบบัญชีนี้หรือไม่?")) return;

  storeData.banks = storeData.banks.filter(b => b.id !== id);

  saveStoreData();
  renderPayment();
  renderAdminBanks();
}

/* ---------- QR DOWNLOAD ---------- */

function saveQR() {
  const image = storeData.payment.qr;

  if (!image) {
    showToast("ยังไม่มี QR Code");
    return;
  }

  downloadImage(image,"Gothic-Payment-QR.png");
}

function downloadImage(src,filename) {
  const link = document.createElement("a");
  link.href = src;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/* ---------- COPY ---------- */

async function copyValue(value) {
  try {
    await navigator.clipboard.writeText(String(value));
    showToast("คัดลอกแล้ว ♡");
  } catch (error) {
    showToast("ไม่สามารถคัดลอกได้");
  }
}

function copyText(id) {
  const element = document.getElementById(id);
  if (!element) return;

  copyValue(element.textContent);
}

/* ---------- CONTACT ---------- */

function renderContacts() {
  document.getElementById("contactList").innerHTML =
    storeData.contacts.map(contact => `
      <a class="contact-button"
        href="${escapeHTML(contact.url)}"
        target="_blank"
        rel="noopener noreferrer">

        <i class="${escapeHTML(contact.icon || "fa-solid fa-link")}"></i>

        <span>${escapeHTML(contact.name)}</span>
      </a>
    `).join("");
}

function saveContact(event) {
  event.preventDefault();

  if (!requireAdmin()) return;

  const id = document.getElementById("editContactId").value;

  const contact = {
    id: id || makeId(),
    name: document.getElementById("contactName").value.trim(),
    url: document.getElementById("contactUrl").value.trim(),
    icon: document.getElementById("contactIcon").value.trim()
  };

  if (!/^https?:\/\//i.test(contact.url)) {
    showToast("กรุณาใส่ลิงก์ที่ขึ้นต้นด้วย https://");
    return;
  }

  if (id) {
    storeData.contacts = storeData.contacts.map(item =>
      item.id === id ? contact : item
    );
  } else {
    storeData.contacts.push(contact);
  }

  saveStoreData();

  event.target.reset();
  document.getElementById("editContactId").value = "";

  renderContacts();
  renderAdminContacts();

  showToast("บันทึกช่องทางติดต่อแล้ว");
}

function renderAdminContacts() {
  document.getElementById("adminContactList").innerHTML =
    storeData.contacts.map(contact => `
      <div class="admin-list-item">
        <div>
          <strong>${escapeHTML(contact.name)}</strong>
          <p>${escapeHTML(contact.url)}</p>
        </div>

        <div class="admin-list-actions">
          <button onclick="editContact('${contact.id}')">แก้ไข</button>
          <button class="delete-btn"
            onclick="deleteContact('${contact.id}')">ลบ</button>
        </div>
      </div>
    `).join("");
}

function editContact(id) {
  if (!requireAdmin()) return;

  const contact = storeData.contacts.find(c => c.id === id);
  if (!contact) return;

  document.getElementById("editContactId").value = id;
  document.getElementById("contactName").value = contact.name;
  document.getElementById("contactUrl").value = contact.url;
  document.getElementById("contactIcon").value = contact.icon;
}

function deleteContact(id) {
  if (!requireAdmin()) return;
  if (!confirm("ลบช่องทางติดต่อนี้หรือไม่?")) return;

  storeData.contacts = storeData.contacts.filter(c => c.id !== id);

  saveStoreData();
  renderContacts();
  renderAdminContacts();
}

/* ---------- ADMIN NAVIGATION ---------- */

function showAdminTab(id,button) {
  if (!requireAdmin()) return;

  document.querySelectorAll(".admin-tab").forEach(tab => {
    tab.classList.remove("active");
  });

  document.querySelectorAll(".admin-tabs button").forEach(btn => {
    btn.classList.remove("active");
  });

  document.getElementById(id)?.classList.add("active");

  if (button) button.classList.add("active");

  if (id === "adminProducts") renderAdminProducts();
  if (id === "adminReviews") renderAdminReviews();
  if (id === "adminStories") renderAdminStories();
  if (id === "adminPayment") renderAdminBanks();
  if (id === "adminContacts") renderAdminContacts();
  if (id === "adminDesign") renderDesignSettings();
}

/* ---------- ADMIN PRODUCT LIST ---------- */

function renderAdminProducts() {
  const container = document.getElementById("adminProductList");

  container.innerHTML = storeData.products.map((product,index) => `
    <div class="admin-list-item">
      <img src="${getProductImage(product)}" alt="">

      <div style="flex:1;min-width:0">
        <strong>${escapeHTML(product.name)}</strong>
        <p>฿${formatMoney(product.price)}</p>
      </div>

      <div class="admin-list-actions">
        <button onclick="moveProduct('${product.id}',-1)">↑</button>
        <button onclick="moveProduct('${product.id}',1)">↓</button>
        <button onclick="editProduct('${product.id}')">แก้ไข</button>
        <button class="delete-btn"
          onclick="deleteProduct('${product.id}')">ลบ</button>
      </div>
    </div>
  `).join("");
}

/* ---------- THEMES ---------- */

const THEMES = {
  darkPurple: {
    label: "Dark Purple",
    colors: {
      bg:"#100b17", bg2:"#1a1125", card:"#21172e",
      card2:"#2b1c3b", border:"#49345d",
      text:"#f5edf9", muted:"#b9a8c7",
      primary:"#bd8be8", primary2:"#75469d",
      button:"#70438f", button2:"#a16bc3",
      gold:"#e5c2a3", star:"#e8b7e8",
      reviewCircle:"#573b6b"
    }
  },

  midnight: {
    label: "Midnight",
    colors: {
      bg:"#080d18", bg2:"#101a2a", card:"#152237",
      card2:"#1c3049", border:"#344d70",
      text:"#e9f1ff", muted:"#a4b8d0",
      primary:"#85b9ed", primary2:"#4779ac",
      button:"#416c9b", button2:"#76a9d7",
      gold:"#d4c5a4", star:"#a9d6ff",
      reviewCircle:"#345477"
    }
  },

  darkRose: {
    label: "Dark Rose",
    colors: {
      bg:"#190d15", bg2:"#28121e", card:"#341b29",
      card2:"#472438", border:"#754157",
      text:"#fff0f5", muted:"#d2aebb",
      primary:"#e99abf", primary2:"#a64e78",
      button:"#93456c", button2:"#d16d9c",
      gold:"#f0c9ad", star:"#ffc1dc",
      reviewCircle:"#7a3e5c"
    }
  },

  emerald: {
    label: "Emerald Night",
    colors: {
      bg:"#091511", bg2:"#11231b", card:"#183027",
      card2:"#244536", border:"#3d6852",
      text:"#ecfff3", muted:"#a8c9b5",
      primary:"#91d4ae", primary2:"#4b9671",
      button:"#347857", button2:"#68ae86",
      gold:"#d7c99c", star:"#b1edca",
      reviewCircle:"#32634a"
    }
  },

  silver: {
    label: "Silver Night",
    colors: {
      bg:"#111419", bg2:"#1b2028", card:"#252c36",
      card2:"#303946", border:"#596575",
      text:"#f4f5f8", muted:"#b4bdc9",
      primary:"#c4d2e4", primary2:"#849bb8",
      button:"#657e9d", button2:"#9bb0ca",
      gold:"#e5d5b5", star:"#d8e8ff",
      reviewCircle:"#52627b"
    }
  },

  darkCherry: {
    label: "Cherry Blood",
    colors: {
      bg:"#170a0d", bg2:"#250e14", card:"#35151e",
      card2:"#471b29", border:"#793444",
      text:"#ffedf0", muted:"#d1a6ad",
      primary:"#e77c99", primary2:"#a13c59",
      button:"#8a304d", button2:"#c25375",
      gold:"#d9b5a1", star:"#ff9fb9",
      reviewCircle:"#74283f"
    }
  },

  lightPink: {
    label: "Pink Dream",
    colors: {
      bg:"#fff3f8", bg2:"#f8e4ef", card:"#ffffff",
      card2:"#f7eaf2", border:"#e7bfd2",
      text:"#482b3b", muted:"#98788b",
      primary:"#d47da6", primary2:"#b45a89",
      button:"#b65d8a", button2:"#dc8db2",
      gold:"#a67d4f", star:"#d99a37",
      reviewCircle:"#eed3e2"
    }
  },

  lavender: {
    label: "Lavender",
    colors: {
      bg:"#f5f0ff", bg2:"#eae0fc", card:"#ffffff",
      card2:"#f1e9ff", border:"#d1bce9",
      text:"#39264f", muted:"#88749e",
      primary:"#9d7bc7", primary2:"#7854aa",
      button:"#7653a2", button2:"#a88bd1",
      gold:"#a98a59", star:"#c49ce9",
      reviewCircle:"#e3d5f4"
    }
  },

  cream: {
    label: "Gothic Cream",
    colors: {
      bg:"#f7f0e7", bg2:"#eee1d3", card:"#fffaf3",
      card2:"#f4e9dd", border:"#d9c3ae",
      text:"#46372e", muted:"#9c8272",
      primary:"#9c6c79", primary2:"#76505f",
      button:"#835565", button2:"#b17b8d",
      gold:"#aa7c4b", star:"#c18b4c",
      reviewCircle:"#ead5c9"
    }
  },

  sky: {
    label: "Moon Sky",
    colors: {
      bg:"#eff6ff", bg2:"#e0ebfa", card:"#ffffff",
      card2:"#e9f1ff", border:"#bfd1eb",
      text:"#283b56", muted:"#758ca9",
      primary:"#709bd0", primary2:"#4c73a8",
      button:"#4d72a4", button2:"#7da6d7",
      gold:"#a98b5a", star:"#d3ad64",
      reviewCircle:"#d6e6f9"
    }
  },

  mint: {
    label: "Mint Fairy",
    colors: {
      bg:"#effbf6", bg2:"#dff3e9", card:"#ffffff",
      card2:"#e7f7ee", border:"#b9ddca",
      text:"#294c3d", muted:"#789c89",
      primary:"#6ab18c", primary2:"#438766",
      button:"#428367", button2:"#75bd99",
      gold:"#aa9562", star:"#d5aa54",
      reviewCircle:"#d5eee0"
    }
  },

  peach: {
    label: "Peach Doll",
    colors: {
      bg:"#fff3ed", bg2:"#f9e4d9", card:"#fffaf6",
      card2:"#f9eae1", border:"#e8c7b6",
      text:"#50372e", muted:"#a28678",
      primary:"#d18c79", primary2:"#aa6253",
      button:"#a75f52", button2:"#d48b77",
      gold:"#aa854e", star:"#db9c4c",
      reviewCircle:"#f1d7c9"
    }
  }
};

function applyTheme(name) {
  const theme = THEMES[name];
  if (!theme) return;

  currentTheme = name;

  const colors = {
    ...theme.colors,
    ...(storeData.settings.colors || {})
  };

  const map = {
    bg:"--bg",
    bg2:"--bg2",
    card:"--card",
    card2:"--card2",
    border:"--border",
    text:"--text",
    muted:"--muted",
    primary:"--primary",
    primary2:"--primary2",
    button:"--button",
    button2:"--button2",
    gold:"--gold",
    star:"--star",
    reviewCircle:"--review-circle"
  };

  Object.entries(map).forEach(([key,variable]) => {
    document.documentElement.style.setProperty(
      variable,colors[key]
    );
  });

  storeData.settings.theme = name;
  renderThemeButtons();
}

function renderThemeButtons() {
  const container = document.getElementById("themeGrid");
  if (!container) return;

  container.innerHTML = Object.entries(THEMES).map(([key,theme]) => `
    <button class="theme-option ${currentTheme === key ? "active" : ""}"
      onclick="applyTheme('${key}')">

      <span class="theme-preview"
        style="background:linear-gradient(90deg,${theme.colors.bg},${theme.colors.primary})">
      </span>

      ${theme.label}
    </button>
  `).join("");
}

const COLOR_LABELS = {
  bg:"สีพื้นหลัง",
  bg2:"สีพื้นหลังรอง",
  card:"สีการ์ด",
  card2:"สีการ์ดไล่เฉด",
  border:"สีเส้นขอบ",
  text:"สีตัวอักษร",
  muted:"สีตัวอักษรรอง",
  primary:"สีหลัก",
  primary2:"สีหลักไล่เฉด",
  button:"สีปุ่ม",
  button2:"สีปุ่มไล่เฉด",
  gold:"สีตกแต่ง",
  star:"สีดาว",
  reviewCircle:"สีวงกลมโปรไฟล์รีวิว"
};

function renderDesignSettings() {
  document.getElementById("designStoreName").value =
    storeData.settings.name || "";

  document.getElementById("designStoreDescription").value =
    storeData.settings.description || "";

  document.getElementById("designMarquee").value =
    storeData.settings.marquee || "";

  renderThemeButtons();

  const container = document.getElementById("customColorSettings");

  const base = THEMES[currentTheme]?.colors || THEMES.darkPurple.colors;

  container.innerHTML = Object.entries(COLOR_LABELS).map(([key,label]) => {
    const color = storeData.settings.colors?.[key] || base[key];

    return `
      <div class="color-setting">
        <label>${label}</label>
        <input type="color" data-color="${key}" value="${color}">
      </div>
    `;
  }).join("");
}

async function saveDesign() {
  if (!requireAdmin()) return;

  try {
    const profileFile =
      document.getElementById("designProfile").files[0];

    const bannerFile =
      document.getElementById("designBanner").files[0];

    if (profileFile) {
      storeData.settings.profile = await fileToDataURL(profileFile);
    }

    if (bannerFile) {
      storeData.settings.banner = await fileToDataURL(bannerFile);
    }

    storeData.settings.name =
      document.getElementById("designStoreName").value.trim();

    storeData.settings.description =
      document.getElementById("designStoreDescription").value.trim();

    storeData.settings.marquee =
      document.getElementById("designMarquee").value.trim();

    const colors = {};

    document.querySelectorAll("[data-color]").forEach(input => {
      colors[input.dataset.color] = input.value;
    });

    storeData.settings.colors = colors;

    saveStoreData();
    applyTheme(currentTheme);
    renderStoreHeader();

    showToast("บันทึกธีมและข้อมูลร้านแล้ว ♡");

  } catch (error) {
    showToast(error.message || "บันทึกไม่สำเร็จ");
  }
}

/* ---------- STORE HEADER ---------- */

function renderStoreHeader() {
  const settings = storeData.settings;

  document.getElementById("topStoreName").textContent =
    settings.name || "GOTHIC STORE";

  document.getElementById("storeName").textContent =
    settings.name || "GOTHIC STORE";

  document.getElementById("storeDescription").textContent =
    settings.description || "";

  document.getElementById("marqueeText").textContent =
    (settings.marquee || "") + " ✦ " + (settings.marquee || "");

  document.getElementById("storeProfile").src =
    settings.profile || placeholderImage();

  document.getElementById("storeBanner").src =
    settings.banner || placeholderImage();

  document.getElementById("receiptStoreName").textContent =
    settings.name || "GOTHIC STORE";
}

/* ---------- EXPORT BACKUP ---------- */

function exportStoreData() {
  if (!requireAdmin()) return;

  const blob = new Blob(
    [JSON.stringify(storeData,null,2)],
    { type:"application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "gothic-store-backup.json";
  link.click();

  URL.revokeObjectURL(url);

  showToast("สำรองข้อมูลแล้ว");
    }
  
/* ==========================================
   GOTHIC STORE - PART 6
   FIREBASE / AUTH / INITIALIZATION
========================================== */

/*
  ใส่ค่าจาก Firebase Console
  Project Settings > General > Your apps

  ห้ามใช้รหัสผ่านแอดมินเป็น API Key
*/

const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "https://zzzzz-12-default-rtdb.firebaseio.com/",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

/*
  ใส่ UID ของบัญชี Firebase Authentication
  ที่ได้รับอนุญาตให้เป็นแอดมิน
*/
const ADMIN_UID = "";

/* ---------- FIREBASE INITIALIZATION ---------- */

let firebaseReady = false;
let firebaseAuth = null;
let firebaseDB = null;
let isAdmin = false;
let databaseSyncTimer = null;

function initializeFirebase() {
  const required = [
    FIREBASE_CONFIG.apiKey,
    FIREBASE_CONFIG.authDomain,
    FIREBASE_CONFIG.projectId,
    FIREBASE_CONFIG.appId
  ];

  if (required.some(value => !value)) {
    setFirebaseStatus("โหมดทดลองในเครื่อง — ยังไม่ได้ตั้งค่า Firebase");
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(FIREBASE_CONFIG);
    }

    firebaseAuth = firebase.auth();
    firebaseDB = firebase.database();

    firebaseReady = true;

    firebaseAuth.onAuthStateChanged(async user => {
      isAdmin = Boolean(
        user &&
        ADMIN_UID &&
        user.uid === ADMIN_UID
      );

      updateAdminUI();

      if (isAdmin) {
        document.getElementById("adminUid").textContent =
          "Admin UID: " + user.uid;
      } else {
        document.getElementById("adminUid").textContent = "";
      }
    });

    loadCloudData();

    setFirebaseStatus("เชื่อมต่อ Firebase แล้ว");

  } catch (error) {
    console.error(error);
    setFirebaseStatus("เชื่อมต่อ Firebase ไม่สำเร็จ");
  }
}

function setFirebaseStatus(message) {
  const element = document.getElementById("firebaseStatus");
  if (element) element.textContent = message;
}

/* ---------- ADMIN AUTHENTICATION ---------- */

function openAdminLogin() {
  if (isAdmin) {
    openModal("adminModal");
    renderAllAdmin();
  } else {
    openModal("adminLoginModal");
  }
}

async function adminLogin(event) {
  event.preventDefault();

  if (!firebaseReady || !firebaseAuth) {
    document.getElementById("adminLoginMessage").textContent =
      "กรุณาตั้งค่า Firebase Web Config ก่อนเข้าสู่ระบบ";
    return;
  }

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  try {
    const credential = await firebaseAuth.signInWithEmailAndPassword(
      email,password
    );

    if (!ADMIN_UID || credential.user.uid !== ADMIN_UID) {
      await firebaseAuth.signOut();

      throw new Error("บัญชีนี้ไม่มีสิทธิ์เป็นแอดมิน");
    }

    isAdmin = true;

    closeModal("adminLoginModal");
    openModal("adminModal");

    renderAllAdmin();

    showToast("เข้าสู่ระบบแอดมินสำเร็จ ♡");

  } catch (error) {
    document.getElementById("adminLoginMessage").textContent =
      error.message || "เข้าสู่ระบบไม่สำเร็จ";
  }
}

async function adminLogout() {
  if (!firebaseAuth) return;

  try {
    await firebaseAuth.signOut();

    isAdmin = false;

    closeModal("adminModal");
    updateAdminUI();

    showToast("ออกจากระบบแล้ว");

  } catch (error) {
    showToast("ออกจากระบบไม่สำเร็จ");
  }
}

function requireAdmin() {
  if (!isAdmin) {
    showToast("กรุณาเข้าสู่ระบบแอดมินก่อน");
    return false;
  }

  return true;
}

function updateAdminUI() {
  const button = document.querySelector(".admin-circle");

  if (button) {
    button.style.color = isAdmin
      ? "var(--primary)"
      : "var(--text)";
  }
}

/* ---------- FIREBASE DATABASE ---------- */

async function loadCloudData() {
  if (!firebaseReady || !firebaseDB) return;

  try {
    const snapshot = await firebaseDB.ref("store").get();

    if (snapshot.exists()) {
      const cloudData = snapshot.val();

      storeData = {
        ...structuredClone(DEFAULT_DATA),
        ...cloudData,
        settings: {
          ...DEFAULT_DATA.settings,
          ...(cloudData.settings || {})
        },
        payment: {
          ...DEFAULT_DATA.payment,
          ...(cloudData.payment || {})
        },
        products: Array.isArray(cloudData.products)
          ? cloudData.products : [],
        reviews: Array.isArray(cloudData.reviews)
          ? cloudData.reviews : [],
        stories: Array.isArray(cloudData.stories)
          ? cloudData.stories : [],
        banks: Array.isArray(cloudData.banks)
          ? cloudData.banks : [],
        contacts: Array.isArray(cloudData.contacts)
          ? cloudData.contacts : []
      };

      localStorage.setItem(STORE_KEY,JSON.stringify(storeData));

      refreshWebsite();
    }

    setFirebaseStatus("โหลดข้อมูลร้านค้าสำเร็จ");

  } catch (error) {
    console.error(error);
    setFirebaseStatus("โหลดข้อมูลไม่สำเร็จ");
  }
}

/*
  แทนที่ saveStoreData เดิมด้วยฟังก์ชันนี้

  ข้อมูลจะถูกบันทึกในเครื่องเสมอ
  และส่งไป Firebase เฉพาะเมื่อแอดมินล็อกอินแล้ว
*/

function saveStoreData() {
  try {
    localStorage.setItem(STORE_KEY,JSON.stringify(storeData));

    if (firebaseReady && firebaseDB && isAdmin) {
      clearTimeout(databaseSyncTimer);

      databaseSyncTimer = setTimeout(async () => {
        try {
          await firebaseDB.ref("store").set(storeData);
          setFirebaseStatus("บันทึกข้อมูลออนไลน์สำเร็จ");
        } catch (error) {
          console.error(error);
          setFirebaseStatus("บันทึกออนไลน์ไม่สำเร็จ");
          showToast("บันทึกออนไลน์ไม่สำเร็จ");
        }
      },500);
    }

    return true;

  } catch (error) {
    console.error(error);
    showToast("พื้นที่จัดเก็บไม่เพียงพอ");
    return false;
  }
}

/* ---------- RENDER ALL ---------- */

function renderAllAdmin() {
  if (!requireAdmin()) return;

  renderAdminProducts();
  renderAdminReviews();
  renderAdminStories();
  renderAdminBanks();
  renderAdminContacts();
  renderDesignSettings();
  renderPayment();
}

function refreshWebsite() {
  renderStoreHeader();
  renderProducts();
  renderReviews();
  renderStories();
  renderPayment();
  renderContacts();

  currentTheme = storeData.settings.theme || "darkPurple";

  applyTheme(currentTheme);
  renderCart();
}

/* ---------- EXPORT / IMPORT SUPPORT ---------- */

function importStoreData(event) {
  if (!requireAdmin()) return;

  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);

      if (!imported.products || !imported.settings) {
        throw new Error("รูปแบบไฟล์ไม่ถูกต้อง");
      }

      if (!confirm("ต้องการนำเข้าข้อมูลและแทนที่ข้อมูลเดิมหรือไม่?")) {
        return;
      }

      storeData = {
        ...structuredClone(DEFAULT_DATA),
        ...imported
      };

      saveStoreData();
      refreshWebsite();

      showToast("นำเข้าข้อมูลสำเร็จ");

    } catch (error) {
      showToast(error.message || "นำเข้าข้อมูลไม่สำเร็จ");
    }
  };

  reader.readAsText(file);
}

/* ---------- INITIALIZE ---------- */

document.addEventListener("DOMContentLoaded", () => {
  refreshWebsite();

  initializeFirebase();

  renderCart();

  setRating(5);

  console.log("GOTHIC STORE INITIALIZED");
});
  
