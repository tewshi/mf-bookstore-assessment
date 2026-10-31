import { afterEach, describe, expect, test } from 'vitest'
import {
  addClient,
  notifyAdmins,
  notifyEveryone,
  notifyUser,
  notifyUserAndAdmins,
  removeClient,
} from '../src/lib/live.js'

// Who hears which live update (lib/live.js). Instead of real browser
// tabs, each "tab" is an object whose res.write() collects the topics.

const tabs = []

function openTab(userId, isAdmin = false) {
  const tab = {
    userId,
    isAdmin,
    heard: [],
    // "data: orders\n\n" -> "orders"
    res: { write: (line) => tab.heard.push(line.trim().replace('data: ', '')) },
  }
  addClient(tab)
  tabs.push(tab)
  return tab
}

// Every test starts with no tabs open
afterEach(() => {
  for (const tab of tabs.splice(0)) removeClient(tab)
})

describe('live updates', () => {
  test('notifyEveryone reaches visitors, customers and admins', () => {
    const visitor = openTab(null)
    const customer = openTab('ada')
    const admin = openTab('boss', true)
    notifyEveryone('books')
    expect(visitor.heard).toEqual(['books'])
    expect(customer.heard).toEqual(['books'])
    expect(admin.heard).toEqual(['books'])
  })

  test("notifyUser reaches every tab of that person, and nobody else's", () => {
    const laptop = openTab('ada')
    const phone = openTab('ada')
    const someoneElse = openTab('bob')
    const admin = openTab('boss', true)
    notifyUser('wishlist', 'ada')
    expect(laptop.heard).toEqual(['wishlist'])
    expect(phone.heard).toEqual(['wishlist'])
    expect(someoneElse.heard).toEqual([])
    expect(admin.heard).toEqual([])
  })

  test('notifyAdmins reaches admins only', () => {
    const customer = openTab('ada')
    const admin = openTab('boss', true)
    notifyAdmins('users')
    expect(customer.heard).toEqual([])
    expect(admin.heard).toEqual(['users'])
  })

  test('notifyUserAndAdmins reaches the buyer and the admins', () => {
    const buyer = openTab('ada')
    const someoneElse = openTab('bob')
    const admin = openTab('boss', true)
    notifyUserAndAdmins('orders', 'ada')
    expect(buyer.heard).toEqual(['orders'])
    expect(someoneElse.heard).toEqual([])
    expect(admin.heard).toEqual(['orders'])
  })

  test('a closed tab hears nothing more', () => {
    const tab = openTab('ada')
    removeClient(tab)
    notifyEveryone('books')
    expect(tab.heard).toEqual([])
  })
})
