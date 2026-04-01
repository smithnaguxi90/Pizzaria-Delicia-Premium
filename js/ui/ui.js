import { store } from "../store/store.js";
import { MENU_DATA } from "../data/menu.js";
import { formatCurrency } from "../utils/formatters.js";

export const UI = {
  init() {
    this.setupEventListeners();
    this.setupScrollSpy();
    this.checkStatus();
    this.initNewsletterAnimation();
    this.setupFAQAccordion();

    store.subscribe((state) => {
      this.renderCart(state.cart);
      this.updateTheme(state.theme);
      this.updateFavorites(state.favorites);
    });

    this.renderMenu(MENU_DATA);
    store.notify();
  },

  setupFAQAccordion() {
    const faqDetails = document.querySelectorAll("#faq-modal details");
    faqDetails.forEach((targetDetail) => {
      targetDetail.querySelector("summary").addEventListener("click", () => {
        if (!targetDetail.open) {
          faqDetails.forEach((detail) => {
            if (detail !== targetDetail) detail.removeAttribute("open");
          });
        }
      });
    });
  },

  setupEventListeners() {
    // Remove Global Loader on Window Load
    window.addEventListener("load", () => {
      const loader = document.getElementById("global-loader");
      if (loader) {
        loader.classList.add("hidden");
        setTimeout(() => loader.remove(), 500); // Remove from DOM after fade transition
      }
    });

    document
      .getElementById("theme-toggle")
      .addEventListener("click", () => store.toggleTheme());

    const toggleCart = () => {
      const sidebar = document.getElementById("sidebar");
      const isOpen = sidebar.classList.toggle("open");
      document.getElementById("backdrop").classList.toggle("open");
      document.getElementById("cart-toggle").setAttribute("aria-expanded", isOpen);
    };
    document
      .getElementById("cart-toggle")
      .addEventListener("click", toggleCart);
    document
      .getElementById("close-sidebar")
      .addEventListener("click", toggleCart);
    document.getElementById("backdrop").addEventListener("click", toggleCart);

    // Mobile Menu Logic
    window.toggleMobileMenu = () => {
      const menu = document.getElementById("mobile-menu");
      const isOpen = menu.classList.toggle("open");
      const toggleBtn = document.getElementById("mobile-menu-toggle");
      if (toggleBtn) toggleBtn.setAttribute("aria-expanded", isOpen);
    };
    document
      .getElementById("mobile-menu-toggle")
      .addEventListener("click", window.toggleMobileMenu);
    document
      .getElementById("close-mobile-menu")
      .addEventListener("click", window.toggleMobileMenu);

    document.querySelectorAll(".mobile-nav-link").forEach((link) => {
      link.addEventListener("click", window.toggleMobileMenu);
    });

    document.getElementById("filters").addEventListener("click", (e) => {
      if (!e.target.classList.contains("filter-chip")) return;
      document
        .querySelectorAll(".filter-chip")
        .forEach((c) => c.classList.remove("active"));
      e.target.classList.add("active");
      const cat = e.target.dataset.filter;
      const filtered =
        cat === "all" ? MENU_DATA : MENU_DATA.filter((m) => m.category === cat);
      this.renderMenu(filtered);
    });

    // Modal Toggles Helpers
    const setupModal = (modalId, triggerId) => {
      const modal = document.getElementById(modalId);
      const trigger = document.getElementById(triggerId);
      const close = modal.querySelector(".close-modal");
      const toggle = () => modal.classList.toggle("open");

      if (trigger)
        trigger.addEventListener("click", (e) => {
          e.preventDefault();
          toggle();
        });
      if (close) close.addEventListener("click", toggle);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) toggle();
      });
      return toggle;
    };

    const toggleCareers = setupModal("careers-modal", "link-careers");
    const togglePrivacy = setupModal("privacy-modal", "link-privacy");
    const toggleContact = setupModal("contact-modal", "link-contact");
    const toggleDelivery = setupModal("delivery-modal", "link-delivery");
    const toggleFaq = setupModal("faq-modal", "link-faq");
    const toggleCustomize = setupModal("customize-modal", null);
    this.toggleCustomize = toggleCustomize;

    // Lógica do Formulário de Personalização (Tamanho e Borda)
    const customizeForm = document.getElementById("customize-form");
    if (customizeForm) {
      customizeForm.addEventListener("change", () => this.updateCustomizePrice());
      customizeForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const size = customizeForm.elements["size"].value;
        const crust = customizeForm.elements["crust"].value;

        let sizeLabel = size === "P" ? "Pequena" : size === "M" ? "Média" : "Grande";
        const nameAppend = `${sizeLabel}${crust !== "Tradicional" ? ` c/ Borda de ${crust}` : ""}`;

        // Cria um Produto Único na Loja para evitar que bordas diferentes se aglomerem no carrinho
        const customizedProduct = {
          ...this.currentProduct,
          id: `${this.currentProduct.id}-${size}-${crust}`,
          name: `${this.currentProduct.name} (${nameAppend})`,
          price: this.currentFinalPrice,
        };

        store.addToCart(customizedProduct);
        this.toast(`${customizedProduct.name} adicionado!`);
        this.toggleCustomize(); // Fecha o modal
      });
    }

    // Forms Submissions
    document
      .getElementById("reservation-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.simulateLoading(
          e.target.querySelector("button"),
          "Mesa Confirmada! SMS enviado.",
          () => e.target.reset(),
        );
      });

    document
      .getElementById("newsletter-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.simulateLoading(
          e.target.querySelector("button"),
          "Inscrição realizada com sucesso!",
          () => e.target.reset(),
        );
      });

    document.getElementById("careers-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.simulateLoading(
        e.target.querySelector("button"),
        "Candidatura enviada!",
        () => {
          e.target.reset();
          toggleCareers();
        },
      );
    });

    document.getElementById("contact-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.simulateLoading(
        e.target.querySelector("button"),
        "Mensagem enviada!",
        () => {
          e.target.reset();
          toggleContact();
        },
      );
    });

    // Checkout Logic
    document
      .getElementById("btn-start-checkout")
      .addEventListener("click", () => {
        if (store.state.cart.length === 0)
          return this.toast("Carrinho vazio!", "error");
        document.getElementById("btn-start-checkout").classList.add("d-none");
        document.getElementById("checkout-form").classList.remove("d-none");
      });

    document
      .getElementById("btn-cancel-checkout")
      .addEventListener("click", () => {
        document.getElementById("btn-start-checkout").classList.remove("d-none");
        document.getElementById("checkout-form").classList.add("d-none");
      });

    // Lógica para mostrar/ocultar campo de troco
    const paymentSelect = document.getElementById("check-payment");
    const changeWrapper = document.getElementById("change-wrapper");
    if (paymentSelect && changeWrapper) {
      paymentSelect.addEventListener("change", (e) => {
        if (e.target.value === "Dinheiro") {
          changeWrapper.classList.remove("d-none");
        } else {
          changeWrapper.classList.add("d-none");
          document.getElementById("check-change").value = ""; // Limpa o valor se trocar de pagamento
        }
      });
    }

    document.getElementById("checkout-form").addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("check-name").value;
      const address = document.getElementById("check-address").value;
      const payment = document.getElementById("check-payment").value;
      const change = document.getElementById("check-change").value;
      const cart = store.state.cart;
      const total = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

      const submitBtn = e.target.querySelector('button[type="submit"]');
      const originalBtnHtml = submitBtn.innerHTML;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando GPS...';
      submitBtn.disabled = true;

      // Promessa para buscar a localização de forma assíncrona com limite de 5 segundos
      const getGPSLocation = () => new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          () => resolve(null), // Continua o código em caso de recusa/erro
          { timeout: 5000 }
        );
      });

      const coords = await getGPSLocation();

      // Gera um código alfanumérico aleatório de 6 caracteres (ex: A8F9B2)
      const orderNumber = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Captura a data e hora atuais formatadas
      const now = new Date();
      const orderDate = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Montando a mensagem para o WhatsApp
      let message = `*PEDIDO #${orderNumber}* 🍕\n`;
      message += `Data: ${orderDate}\n`;
      message += `Nome: ${name}\n`;
      message += `Endereço: ${address}\n`;
      
      if (coords) {
        message += `📍 Localização GPS: https://www.google.com/maps?q=${coords.latitude},${coords.longitude}\n`;
      }
      
      message += `\n*ITENS:*\n`;

      cart.forEach((item) => {
        message += `- ${item.qty}x ${item.name} (${formatCurrency(item.price * item.qty)})\n`;
      });

      message += `\n*TOTAL:* ${formatCurrency(total)}\n`;
      message += `*PAGAMENTO:* ${payment}`;
      if (payment === "Dinheiro" && change) {
        message += `\n*TROCO PARA:* ${change}`;
      }
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/5511999999999?text=${encodedMessage}`;

      submitBtn.innerHTML = originalBtnHtml;
      submitBtn.disabled = false;

      this.simulateLoading(
        submitBtn,
        "Redirecionando...",
        () => {
          window.open(whatsappUrl, "_blank"); // Abre o WhatsApp
          store.clearCart();
          toggleCart();
          e.target.reset();
          document.getElementById("btn-cancel-checkout").click();
        },
      );
    });

    document.getElementById("clear-cart-btn").addEventListener("click", () => {
      if (
        store.state.cart.length > 0 &&
        confirm("Tem certeza que deseja remover todos os itens?")
      ) {
        store.clearCart();
        this.toast("Carrinho esvaziado.", "success");
      }
    });

    // Event Delegation para Menu Grid
    document.getElementById("menu-grid").addEventListener("click", (e) => {
      const favBtn = e.target.closest(".fav-btn");
      const addBtn = e.target.closest(".add-btn");

      if (favBtn) {
        const id = parseInt(favBtn.dataset.id);
        store.toggleFavorite(id);
      } else if (addBtn) {
        const id = parseInt(addBtn.dataset.id);
        this.openCustomize(id);
      }
    });

    // Event Delegation para Carrinho
    document.getElementById("cart-content").addEventListener("click", (e) => {
      const qtyBtn = e.target.closest(".qty-btn");
      if (qtyBtn) {
        const rawId = qtyBtn.dataset.id; // Suporta strings (ex: '1-M-Catupiry') ou converte de volta para int
        const id = isNaN(rawId) ? rawId : Number(rawId);
        const delta = parseInt(qtyBtn.dataset.delta);
        store.updateCartQty(id, delta);
      }
    });

    // Botões e Triggers Estáticos
    const cvWrapper = document.getElementById("cv-upload-wrapper");
    if (cvWrapper)
      cvWrapper.addEventListener("click", () =>
        document.getElementById("career-cv").click(),
      );

    // Evento de Upload de CV (Substitui o onchange do HTML)
    const cvInput = document.getElementById("career-cv");
    if (cvInput) {
      cvInput.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          e.target.previousElementSibling.innerText = e.target.files[0].name;
        }
      });
    }

    const btnPrivacy = document.getElementById("btn-accept-privacy");
    if (btnPrivacy)
      btnPrivacy.addEventListener("click", () =>
        document.getElementById("privacy-modal").classList.remove("open"),
      );

    const btnWhatsapp = document.getElementById("btn-whatsapp");
    if (btnWhatsapp)
      btnWhatsapp.addEventListener("click", () => {
        window.open(
          "https://wa.me/5511999999999?text=Ol%C3%A1%2C%20estou%20no%20site%20e%20gostaria%20de%20falar%20com%20um%20atendente.",
          "_blank",
        );
      });

    // CEP Check
    const checkCepBtn = document.getElementById("check-cep-btn");
    const cepInput = document.getElementById("delivery-cep");
    if (cepInput && checkCepBtn) {
      cepInput.addEventListener("input", (e) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value.length > 5)
          value = value.substring(0, 5) + "-" + value.substring(5, 8);
        e.target.value = value;
      });
      checkCepBtn.addEventListener("click", () => {
        if (cepInput.value.replace(/\D/g, "").length !== 8)
          return this.toast("CEP inválido.", "error");
        this.simulateLoading(checkCepBtn, "Verificando...", () => {
          this.toast("🎉 Entregamos no seu endereço!", "success");
          setTimeout(toggleDelivery, 1500);
        });
      });
    }

    // Máscara universal para todos os campos de telefone
    document.querySelectorAll('input[type="tel"]').forEach((input) => {
      input.addEventListener("input", (e) => {
        let x = e.target.value.replace(/\D/g, "").match(/(\d{0,2})(\d{0,5})(\d{0,4})/);
        e.target.value = !x[2] ? x[1] : "(" + x[1] + ") " + x[2] + (x[3] ? "-" + x[3] : "");
      });
    });
  },

  openCustomize(id) {
    const product = MENU_DATA.find((p) => p.id === id);
    if (!product) return;
    this.currentProduct = product;

    document.getElementById("customize-img").src = product.image;
    document.getElementById("customize-name").innerText = product.name;
    document.getElementById("customize-base-price").innerText = `A partir de ${formatCurrency(product.price)}`;

    document.getElementById("customize-form").reset(); // Volta pro Padrão (Média)
    this.updateCustomizePrice();

    document.getElementById("customize-modal").classList.add("open");
  },

  updateCustomizePrice() {
    if (!this.currentProduct) return;
    const form = document.getElementById("customize-form");
    const size = form.elements["size"].value;
    const crust = form.elements["crust"].value;

    let finalPrice = this.currentProduct.price;
    if (size === "P") finalPrice *= 0.8; // -20%
    if (size === "G") finalPrice *= 1.2; // +20%
    if (crust === "Catupiry" || crust === "Cheddar") finalPrice += 10;

    document.getElementById("customize-final-price").innerText = `- ${formatCurrency(finalPrice)}`;
    this.currentFinalPrice = finalPrice;
  },

  initNewsletterAnimation() {
    const input = document.getElementById("newsletter-email");
    if (!input) return;
    const original = input.getAttribute("placeholder");
    let hasCursor = true;
    setInterval(() => {
      if (document.activeElement !== input) {
        input.setAttribute("placeholder", original + (hasCursor ? "|" : ""));
        hasCursor = !hasCursor;
      } else input.setAttribute("placeholder", original);
    }, 800);
  },

  checkStatus() {
    const now = new Date();
    const hour = now.getHours();
    const isOpen = hour >= 18 && hour < 23;
    const badge = document.getElementById("status-badge");
    const text = document.getElementById("status-text");
    if (isOpen) {
      badge.className = "status-badge open";
      text.innerText = "Aberto Agora";
    } else {
      badge.className = "status-badge closed";
      text.innerText = "Fechado (Abre às 18h)";
    }
  },

  setupScrollSpy() {
    const sections = document.querySelectorAll("section");
    const navLinks = document.querySelectorAll(".nav-link");
    let ticking = false;

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const nav = document.getElementById("navbar");
          if (window.scrollY > 50) nav.classList.add("scrolled");
          else nav.classList.remove("scrolled");

          const heroBg = document.getElementById("hero-bg");
          if (heroBg) heroBg.style.transform = `translateY(${window.scrollY * 0.5}px)`;

          let current = "";
          sections.forEach((section) => {
            if (window.scrollY >= section.offsetTop - 150) current = "#" + section.id;
          });
          navLinks.forEach((link) => {
            link.classList.remove("active");
            if (link.getAttribute("href") === current) link.classList.add("active");
          });
          ticking = false;
        });
        ticking = true;
      }
    });
  },

  renderMenu(items) {
    const grid = document.getElementById("menu-grid");
    grid.innerHTML = items
      .map(
        (item) => `
          <article class="card">
              <button class="fav-btn" data-id="${item.id}">
                  <i class="fas fa-heart"></i>
              </button>
              <div class="card-image-wrapper">
                  <img src="${item.image}" alt="${
                    item.name
                  }" class="card-img" id="img-${item.id}" loading="lazy" decoding="async">
              </div>
              <div class="card-content">
                  <div class="card-tags">
                      ${item.tags
                        .map(
                          (t) =>
                            `<span class="tag ${
                              t === "Hot" ? "hot" : ""
                            }">${t}</span>`,
                        )
                        .join("")}
                  </div>
                  <h3 class="card-title">${item.name}</h3>
                  <p class="card-desc">${item.desc}</p>
                  <div class="card-footer">
                      <span class="price">${formatCurrency(item.price)}</span>
                      <button class="add-btn" data-id="${item.id}">
                          <i class="fas fa-plus"></i>
                      </button>
                  </div>
              </div>
          </article>
      `,
      )
      .join("");
    this.updateFavorites(store.state.favorites);

    // Intersection Observer para animação de Fade-in
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
            obs.unobserve(entry.target); // Para de observar após aparecer
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    document.querySelectorAll(".card").forEach((card, index) => {
      // Cria o efeito de cascata (stagger) baseado no índice
      card.style.transitionDelay = `${index * 50}ms`;
      observer.observe(card);

      // Remove o delay logo após a animação terminar para não atrasar o efeito de Hover
      setTimeout(() => {
        card.style.transitionDelay = "0ms";
      }, 600 + index * 50);
    });
  },

  renderCart(cart) {
    const container = document.getElementById("cart-content");
    const footer = document.getElementById("sidebar-footer");
    const badge = document.getElementById("cart-count");
    const clearBtn = document.getElementById("clear-cart-btn");

    const totalQty = cart.reduce((acc, i) => acc + i.qty, 0);
    badge.innerText = totalQty;
    badge.classList.toggle("visible", totalQty > 0);

    if (cart.length > 0) {
      clearBtn.classList.add("visible");
    } else {
      clearBtn.classList.remove("visible");
    }

    if (cart.length === 0) {
      container.innerHTML = `<div class="cart-empty-state"><i class="fas fa-shopping-basket cart-empty-icon"></i><p>Seu carrinho está vazio</p></div>`;
      footer.classList.add("d-none");
    } else {
      footer.classList.remove("d-none");
      container.innerHTML = cart
        .map(
          (item) => `
              <div class="cart-item">
                  <img src="${item.image}">
                  <div class="cart-item-details">
                      <h4>${item.name}</h4>
                      <div class="cart-item-price">${formatCurrency(item.price * item.qty)}</div>
                      <div class="qty-control">
                          <button class="qty-btn" data-id="${item.id}" data-delta="-1">-</button>
                          <span class="cart-item-qty-value">${
                            item.qty
                          }</span>
                          <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
                      </div>
                  </div>
              </div>
          `,
        )
        .join("");
      const total = cart.reduce((acc, i) => acc + i.price * i.qty, 0);
      document.getElementById("cart-total").innerText = formatCurrency(total);
    }
  },

  updateTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const icon = document.querySelector("#theme-toggle i");
    icon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  },

  updateFavorites(favs) {
    document.querySelectorAll(".fav-btn").forEach((btn) => {
      const id = parseInt(btn.dataset.id);
      if (favs.includes(id)) {
        btn.classList.add("active");
        btn.querySelector("i").className = "fas fa-heart";
      } else {
        btn.classList.remove("active");
        btn.querySelector("i").className = "far fa-heart";
      }
    });
  },

  addToCartAnim(id) {
    const product = MENU_DATA.find((p) => p.id === id);
    const sourceImg = document.getElementById(`img-${id}`);
    const cartIcon = document.getElementById("cart-toggle");

    if (sourceImg && cartIcon && window.innerWidth > 768) {
      const flyImg = sourceImg.cloneNode();
      flyImg.classList.add("flying-img");
      const rect = sourceImg.getBoundingClientRect();
      const targetRect = cartIcon.getBoundingClientRect();

      flyImg.style.top = `${rect.top}px`;
      flyImg.style.left = `${rect.left}px`;
      flyImg.style.width = `${rect.width}px`;
      flyImg.style.height = `${rect.height}px`;

      document.body.appendChild(flyImg);
      void flyImg.offsetWidth;

      flyImg.style.top = `${targetRect.top + 10}px`;
      flyImg.style.left = `${targetRect.left + 10}px`;
      flyImg.style.width = "20px";
      flyImg.style.height = "20px";
      flyImg.style.opacity = "0";

      setTimeout(() => {
        flyImg.remove();
        store.addToCart(product);
        this.toast(`${product.name} adicionado!`);
      }, 800);
    } else {
      store.addToCart(product);
      this.toast(`${product.name} adicionado!`);
    }
  },

  simulateLoading(btn, successMsg, callback) {
    const originalHTML = btn.innerHTML;
    const originalWidth = btn.offsetWidth;
    btn.style.width = `${originalWidth}px`;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    btn.disabled = true;
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-check"></i>';
      this.toast(successMsg, "success");
      setTimeout(() => {
        callback();
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        btn.style.width = "";
      }, 1000);
    }, 1500);
  },

  toast(msg, type = "success") {
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `<i class="fas ${
      type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
    }" style="color: ${
      type === "success" ? "var(--success)" : "var(--error)"
    }"></i> ${msg}`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      setTimeout(() => el.remove(), 300);
    }, 3000);
  },
};
