const contacts = Array.from({ length: 300 }, (_, i) => ({
  id: i,
  name: 'Name' + i,
  surname: 'Surname' + i,
  company_name: 'Company' + i,
  phone: '123456789' + i,
  email: 'email' + i + '@example.com',
  city: 'City' + i,
  type: 'cliente',
  payment_profile: 'pagador_normal'
}));

const search = 'Name299';
const filterType = 'all';
const filterPayment = 'all';

console.time('filter');
for (let i = 0; i < 1000; i++) {
  const searchLower = search.toLowerCase();
  const filtered = contacts.filter(c => {
    const matchSearch = `${c.name} ${c.surname} ${c.company_name} ${c.phone} ${c.email} ${c.city}`.toLowerCase().includes(searchLower);
    const matchType = filterType === 'all' || c.type === filterType;
    const matchPayment = filterPayment === 'all' || c.payment_profile === filterPayment;
    return matchSearch && matchType && matchPayment;
  });
}
console.timeEnd('filter');

// Optimized version
const contactsWithSearch = contacts.map(c => ({
    ...c,
    _searchStr: `${c.name} ${c.surname} ${c.company_name} ${c.phone} ${c.email} ${c.city}`.toLowerCase()
}));

console.time('filter_optimized');
for (let i = 0; i < 1000; i++) {
    const searchLower = search.toLowerCase();
    const filtered = contactsWithSearch.filter(c => {
        const matchSearch = c._searchStr.includes(searchLower);
        const matchType = filterType === 'all' || c.type === filterType;
        const matchPayment = filterPayment === 'all' || c.payment_profile === filterPayment;
        return matchSearch && matchType && matchPayment;
    });
}
console.timeEnd('filter_optimized');
