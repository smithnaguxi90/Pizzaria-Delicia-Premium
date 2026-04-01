export class Store {
  constructor() {
    this.state = {
      cart: JSON.parse(localStorage.getItem("delicia_cart")) || [],
      theme: localStorage.getItem("delicia_theme") || "dark",
      favorites: JSON.parse(localStorage.getItem("delicia_favs")) || [],
    };
    this.listeners = [];
  }
  subscribe(fn) {
    this.listeners.push(fn);
  }
  notify() {
    this.listeners.forEach((fn) => fn(this.state));
    localStorage.setItem("delicia_cart", JSON.stringify(this.state.cart));
    localStorage.setItem("delicia_theme", this.state.theme);
    localStorage.setItem("delicia_favs", JSON.stringify(this.state.favorites));
  }
  addToCart(product, qty = 1) {
    const exists = this.state.cart.find((p) => p.id === product.id);
    if (exists) exists.qty += qty;
    else this.state.cart.push({ ...product, qty });
    this.notify();
  }
  updateCartQty(id, delta) {
    const item = this.state.cart.find((p) => p.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0)
      this.state.cart = this.state.cart.filter((p) => p.id !== id);
    this.notify();
  }
  clearCart() {
    this.state.cart = [];
    this.notify();
  }
  toggleTheme() {
    this.state.theme = this.state.theme === "light" ? "dark" : "light";
    this.notify();
  }
  // ... demais métodos da Store
}

export const store = new Store();
