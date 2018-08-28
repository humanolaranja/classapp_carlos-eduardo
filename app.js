const fs        = require('fs');
const parse     = require('csv-parse');
const PNF       = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const _         = require('lodash');
const input     = './files/input.csv';

var index = 0; resultarray = new Array(); var base = '';
fs.createReadStream(input)
  .pipe(parse({delimiter: ','}))
  .on('data', function(csvrow) {
    if(index == 0) {
      where = getWhere(csvrow); // get where columns are in csv
      base = getBase(csvrow); // get base json to fill with data
    }
    else {
      var row = new Object(csvrow); // fill data based on base json
      resultarray.push(row); // put the row into array of rows
    }
    index++; // increments index
  })
  .on('end',function() {
    var final = fillData(resultarray, base, where); // call function to fill all data based on base json
    fs.writeFile('./files/output.json', JSON.stringify(final, null, 2), function(err) {
      if(err)
        console.log(err);
      else
        console.log("JSON saved into ./files/output.json");
    });
  });

/**
 * a function that returns a base json based on header
 * @param {array} header - the header array
 * @return {object} the base json
 */
const getBase = (header) => {
  var obj = new Object(); // grant that each var is an different object
  for(let i = 0; i < header.length; i++) {
    var addressobj = new Object();
    if(header[i].includes('email') || header[i].includes('phone')) {
      if(!('addresses' in obj))
        obj['addresses'] = new Array(); //init address
      if(header[i].includes('email'))
        addressobj.type = 'email';
      else
        addressobj.type = 'phone';
      header[i] = header[i].replace('email ', '').replace('phone ', ''); //remove the type in the string
      addressobj.tags = header[i].split(', ');
      addressobj.address = '';
      obj["addresses"].push(addressobj);
    }
    else if(header[i] == 'class') {
      if(!('classes' in obj))
        obj['classes'] = new Array(); // put the prop in the object
    }
    else
      obj[header[i]] = ''; // put the prop in the object
  }
  return obj;
}

/**
 * a function that returns where the columns are
 * @param {array} header - the header array
 * @return {array} the where array
 */
const getWhere = (header) => {
  var where         = new Array();
  where["classes"]  = new Array();
  where["emails"]   = new Array();
  where["phones"]   = new Array();
  for(let i = 0; i < header.length; i++) {
    if(header[i].includes('email'))
      where["emails"].push(i);
    else if(header[i].includes('phone'))
      where["phones"].push(i);
    else if(header[i] == 'class')
        where["classes"].push(i);
      else
        where[header[i]] = i;
  }
  return where;
}

const fillData = (resultarray, base, where) => {
  var final = new Array(); // create an array to put all data
  for(let i = 0; i < resultarray.length; i++) {
    var newline = new Object(base); // create an new base object for each iteration
    var place = (searchPersonByName(resultarray[i][where["fullname"]], final));
    if(place > -1) {
      final[place]["addresses"] = _.concat(final[place]["addresses"], appendAddresses(newline["addresses"], resultarray[i], where));
      final[place]["classes"]   = _.concat(final[place]["classes"], fillClasses(resultarray[i], where["classes"]));
      final[place]["invisible"] = trueOrFalse(final[place]["invisible"], resultarray[i][where["invisible"]]);
      final[place]["see_all"]   = trueOrFalse(final[place]["see_all"], resultarray[i][where["see_all"]]);
    }
    else {
      newline["fullname"]  = resultarray[i][where["fullname"]]; // put the name into array
      newline["eid"]       = resultarray[i][where["eid"]]; // put the eid into array
      newline["addresses"] = fillAddresses(newline["addresses"], resultarray[i], where);
      newline["classes"]   = fillClasses(resultarray[i], where["classes"]);
      newline['invisible'] = trueOrFalse(resultarray[i][where["invisible"]]);
      newline['see_all']   = trueOrFalse(resultarray[i][where["see_all"]]);
      var json = JSON.stringify(newline); // convert into string json
      final.push(JSON.parse(json)); // put this json into final array
    }
  }
  return final = removeAllNullAddress(final); // remove all null address in the last iteration
}

const searchPersonByName = (name, final) => {
  for(let i = 0; i < Object.keys(final).length; i++)
    if(final[i]["fullname"] == name)
      return i;
  return -1;
}

const filterTel = (number) => {
  try
    { number = phoneUtil.parse(number, 'BR'); }
  catch(err)
    { return false; }
  if(phoneUtil.isValidNumberForRegion(number, 'BR')) {
    number = phoneUtil.format(number, PNF.E164).slice(1); // format the number
    return number;
  }
  return false;
}

const validateEmail = (email) => {
  var re = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
  return re.test(email);
}

const removeAllNullAddress = (array) => {
  for (let i = 0; i < array.length; i++)
    for (var j = 0; j < array[i]["addresses"].length; j++)
      if((array[i]["addresses"][j]["address"]) == '' || (array[i]["addresses"][j]["address"]) == null || (array[i]["addresses"][j]["address"]) == false) {
        array[i]["addresses"].splice(j, 1); // remove all null content in addresses
        j = -1; // start searching again, because now the array size is different
      }
  return array;
}

const searchAddress = (address, addresses) => {
  for (var i = 0; i < addresses.length; i++)
    if(addresses[i].address == address)
      return i;
  return false;
}

const trueOrFalse = (final, current = false) => {
  if(final == '' || final == '0' || final == 'no')
    final = false;
  else
    final = true;
  if((final == false) && (current == '1' || current == 'yes' || current == true))
    return true;
  return final;
}

const fillClasses = (resultarray, where) => {
  var array = new Array();
  for (let j = 0; j < where.length; j++) {
    resultarray[where[j]] = resultarray[where[j]].split(' /').join(',').split(', '); // separate classes if has / or ,
    array.push(resultarray[where[j]]);
  }
  array = _.flattenDeep(array).filter(function(e){ return e.replace(/(\r\n|\n|\r)/gm,"")}); // remove empty values from array
  if(array.length == 1) array  = array[0];
  return array;
}

const fillAddresses = (newline, resultarray, where) => {
  var countWherePhone = 0;
  var countWhereEmail = 0;
  for (let j = 0; j < newline.length; j++) {
    if(newline[j].type == 'phone') {
      newline[j].address = filterTel(resultarray[where['phones'][countWherePhone]]);
      countWherePhone++;
    }
    else {
      if(validateEmail(resultarray[where['emails'][countWhereEmail]])) { // if is an valid email
        var hasAddress = searchAddress(resultarray[where['emails'][countWhereEmail]], newline); // verify if the address already exists
        if(hasAddress) {
          for (let i = 0; i < newline[j]["tags"].length; i++)
            newline[hasAddress]["tags"].push(newline[j]["tags"][i]); // just put all tags together
        }
        else
          newline[j].address = resultarray[where['emails'][countWhereEmail]]; // // put the address into array
      }
      else
        newline[j].address = ''; // set address as null
      countWhereEmail++;
    }
  }
  return newline;
}

const appendAddresses = (newline, resultarray, where) => {
  var temp = new Array();
  var countWherePhone = 0;
  var countWhereEmail = 0;
  for (let j = 0; j < newline.length; j++) {
    var newobject = new Object(JSON.parse(JSON.stringify(newline[j]))); // use this object but not with reference
    if(newline[j].type == 'phone') {
      newobject.address = filterTel(resultarray[where['phones'][countWherePhone]]); // put the address
      temp.push(newobject); // put into addresses
      countWherePhone++;
    }
    else {
      var emails = resultarray[where['emails'][countWhereEmail]].split('/'); // separate emails if has /
        for (let i = 0; i < emails.length; i++) {
          if(validateEmail(emails[i])) {
            var newobject = new Object(JSON.parse(JSON.stringify(newline[j]))); // use this object but not with reference
            newobject.address = emails[i]; // put the address
            temp.push(newobject); // put into addresses
          }
        }
      countWhereEmail++;
    }
  }
  return temp;
}
