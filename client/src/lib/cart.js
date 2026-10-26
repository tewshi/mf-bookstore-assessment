// The cart only stores { bookId: quantity }. These turn it into the
// list the cart and checkout pages show, using the books from the API.

// [{ book, quantity }, ...] for every book that is in the cart
export function cartItems(books, cart) {
  return books.filter((book) => cart[book.id]).map((book) => ({ book, quantity: cart[book.id] }))
}

// What the whole cart costs
export function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.book.price * item.quantity, 0)
}
