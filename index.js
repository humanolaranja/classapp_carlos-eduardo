const fs        = require('fs');
const Papa      = require('papaparse');
const _         = require('lodash');
const PNF       = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const input     = './files/input.csv';
var data        = fs.readFileSync(input, 'utf8');
    data        = Papa.parse(data).data;
const indices = (array, search) => { return array.map((e, i) => e.includes(search) ? i : '').filter(String) }
const where = {
  fullname:   indices(data[0], 'fullname'),
  eid:        indices(data[0], 'eid'),
  classes:    indices(data[0], 'class'),
  emails:     indices(data[0], 'email'),
  phones:     indices(data[0], 'phone'),
  invisible:  indices(data[0], 'invisible'),
  see_all:    indices(data[0], 'see_all')
}
const base = () =>  { return {fullname:'', eid:'', classes:[], addresses:[], invisible:'', see_all:'' } }
const validateEmail = (email) => { return /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/.test(email) }
const validatePhone = (number) => {
  try { number = phoneUtil.parse(number, 'BR') }
  catch(err) { return false }
  if(phoneUtil.isValidNumberForRegion(number, 'BR'))
    return phoneUtil.format(number, PNF.E164).slice(1); // format the number
  return false;
}
const putBasics = (data, where, line) => {
  line.fullname   = data[where.fullname];
  line.eid        = data[where.eid];
  line.invisible  = (data[where.invisible] == '' || data[where.invisible] == 0|| data[where.invisible] == 'no') ? false : (!!data[where.invisible]);
  line.see_all    = (data[where.see_all] == '' || data[where.see_all] == 0 || data[where.see_all] == 'no') ? false : (!!data[where.see_all]);;
}
const putClasses = (data, where, line) => {
  for (let j = 0; j < where.classes.length; j++) {
    data[where.classes[j]] = data[where.classes[j]].split(new RegExp([', ', ' / '].join('|'),'g'));
    line.classes.push(data[where.classes[j]]);
  }
  line.classes = _.flattenDeep(line.classes);
  line.classes = _.without(line.classes, '');
  line.classes = (line.classes.length == 1) ? line.classes[0] : line.classes;
}
const putPhones = (base, data, where, line) => {
  for (let j = 0; j < where.phones.length; j++) {
    if(validatePhone(data[where.phones[j]])) {
      let obj = new Object;
      obj.type = 'phone';
      obj.tags = base[where.phones[j]].toString().replace('phone ', '').split(new RegExp([', ', ','].join('|'),'g'));
      obj.address = validatePhone(data[where.phones[j]]);
      line.addresses.push(obj);
    }
  }
}
const putEmails = (base, data, where, line) => {
  for (let j = 0; j < where.emails.length; j++) {
    data[where.emails[j]] = data[where.emails[j]].split('/');
    for (let i = 0; i <= data[where.emails[j]].length; i++) {
      if(validateEmail(data[where.emails[j]][i])) {
        let obj = new Object;
        obj.type = 'email';
        obj.tags = base[where.emails[j]].toString().replace('email ', '').split(new RegExp([', ', ','].join('|'),'g'));
        obj.address = data[where.emails[j]][i];
        line.addresses.push(obj);
      }
    }
  }
}
const findDuplicated = (array) => {
  let duplicated = new Array;
  for (let i = 0; i < array.length; i++)
    for (let j = 0; j < array.length; j++)
      if(array[i].eid == array[j].eid && i != j && (!duplicated.includes(i)))
        duplicated.push(i);
  return duplicated;
}
const merge = (array) => {
  let duplicated = findDuplicated(array);
  for (let i = duplicated.length-1; i > 0; i--) {
    array[duplicated[i-1]].classes    = array[duplicated[i-1]].classes.concat(array[duplicated[i]].classes);
    array[duplicated[i-1]].see_all    = (array[duplicated[i]].see_all != 0) ? array[duplicated[i]].see_all : array[duplicated[i-1]].see_all;
    array[duplicated[i-1]].invisible  = (array[duplicated[i]].invisible != 0) ? array[duplicated[i]].invisible : array[duplicated[i-1]].invisible;
    array[duplicated[i-1]].addresses  = array[duplicated[i-1]].addresses.concat(array[duplicated[i]].addresses);
    delete array[duplicated[i]];
    array = _.reject(array, _.isEmpty);
  }
  return array;
}

var final = new Array();
for (let i = 1; i < data.length; i++) {
  let line = base();
  putBasics(data[i], where, line);
  putClasses(data[i], where, line);
  putEmails(data[0], data[i], where, line);
  putPhones(data[0], data[i], where, line);
  final.push(line);
}

fs.writeFile('./files/output.json', JSON.stringify(merge(final), null, 2), function(err) {
  if(err) console.log(err);
  else console.log("JSON saved into ./files/output.json");
});
