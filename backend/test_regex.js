const searchQuery = 'U.S P';
const parts = searchQuery.split(/[\s\W]+/).filter(Boolean);
const flexibleSearch = parts.join('[\\s\\W]*');
console.log('flexible:', flexibleSearch);
console.log('test U.S. POLO ASSN.:', new RegExp(flexibleSearch, 'i').test('U.S. POLO ASSN.'));
console.log('test US Polo:', new RegExp(flexibleSearch, 'i').test('US Polo'));
console.log('test U. S. P.:', new RegExp(flexibleSearch, 'i').test('U. S. P.'));
