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
      var row = new Object(); // grant that each var is an different object
      row = csvrow; // fill data based on base json
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

/**
 * a function that returns the base json filled with content
 * @param {array} resultarray - the harray that contains all data
 * @param {array} base - the json to use as base
 * @param {array} where - the array to know where columns are
 * @return {object} the base json filled with data
 */
const fillData = (resultarray, base, where) => {
  var final = new Array(); // create an array to put all data
  for(let i = 0; i < resultarray.length; i++) {
    var newline = new Object(); // create an new base object for each iteration
    newline     = base;

    var place = (searchPersonByName(resultarray[i][where["fullname"]], final));
    if(place > -1) { // if are already in the final array
      //filter Addresses
      var countWherePhone = 0;
      var countWhereEmail = 0;
      for (let j = 0; j < newline["addresses"].length; j++) {
        var newobject = new Object(); // create new object
        newobject = JSON.parse(JSON.stringify(newline["addresses"][j])); // use this object but not with reference
        if(newline["addresses"][j].type == 'phone'){
          newobject.address = filterTel(resultarray[i][where['phones'][countWherePhone]]); // put the address
          final[place]["addresses"].push(newobject); // put into addresses
          countWherePhone++;
        }
        else {
          var emails = resultarray[i][where['emails'][countWhereEmail]].split('/'); // separate emails if has /
          if(emails.length > 1) {
            for (let i = 0; i < emails.length; i++) {
              if(validateEmail(emails[i])) {
                var newobject = new Object(); // create new object
                newobject = JSON.parse(JSON.stringify(newline["addresses"][j])); // use this object but not with reference
                newobject.address = emails[i]; // put the address
                final[place]["addresses"].push(newobject); // put into addresses
              }
            }
          }
          else {
            if(validateEmail(resultarray[i][where['emails'][countWhereEmail]])) { // if is an valid email
              newobject.address = resultarray[i][where['emails'][countWhereEmail]]; // put the address
              final[place]["addresses"].push(newobject); // put into addresses
            }
          }
          countWhereEmail++;
        }
      }
      final[place]["classes"]   = _.concat(final[place]["classes"], fillClasses(resultarray[i], where["classes"]));
      final[place]["invisible"] = trueOrFalse(final[place]["invisible"], resultarray[i][where["invisible"]]);
      final[place]["see_all"]   = trueOrFalse(final[place]["see_all"], resultarray[i][where["see_all"]]);
    }
    else {
      newline["fullname"]              = resultarray[i][where["fullname"]]; // put the name into array
      newline["eid"]                   = resultarray[i][where["eid"]]; // put the eid into array
      var countWherePhone = 0;
      var countWhereEmail = 0;
      for (let j = 0; j < newline["addresses"].length; j++) {
        if(newline["addresses"][j].type == 'phone'){
          newline["addresses"][j].address = filterTel(resultarray[i][where['phones'][countWherePhone]]);
          countWherePhone++;
        }
        else{
          if(validateEmail(resultarray[i][where['emails'][countWhereEmail]])) { // if is an valid email
            var hasAddress = searchAddress(resultarray[i][where['emails'][countWhereEmail]], newline["addresses"]); // verify if the address already exists
            if(hasAddress) {
              for (let i = 0; i < newline["addresses"][j]["tags"].length; i++)
                newline["addresses"][hasAddress]["tags"].push(newline["addresses"][j]["tags"][i]); // just put all tags together
            }
            else
              newline["addresses"][j].address = resultarray[i][where['emails'][countWhereEmail]]; // // put the address into array
          }
          else
            newline["addresses"][j].address = ''; // set address as null
          countWhereEmail++;
        }
      }
      newline["classes"]   = fillClasses(resultarray[i], where["classes"]);
      newline['invisible'] = initTrueFalse(resultarray[i][where["invisible"]]);
      newline['see_all']   = initTrueFalse(resultarray[i][where["see_all"]]);

      var json = JSON.stringify(newline); // convert into string json
      final.push(JSON.parse(json)); // put this json into final array
    }
  }
  final = removeAllNullAddress(final); // remove all null address in the last iteration
  return final;
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

const trueOrFalse = (final, current) => {
  if((final == false) && (current == '1' || current == 'yes' || current == true))
    return true;
  return final;
}

const initTrueFalse = (final) => {
  if(final == '' || final == '0' || final == 'no')
    return false;
  return true;
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
