/**
 * @author Carlos Eduardo (Humano Laranja) <contato.carlos@outlook.com>
 */

// dependencies
const fs        = require('fs');
const parse     = require('csv-parse');
const PNF       = require('google-libphonenumber').PhoneNumberFormat;
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

const input = './files/input.csv'; // define input dir

var index = 0; // define index to csv line
var resultarray = new Array(); // array to put the result
var base = ''; // init base var

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
    var final = fillData(resultarray, base); // call function to fill all data based on base json
    // console.log(JSON.stringify(final)); // print the final json
    fs.writeFile('./files/output.json', JSON.stringify(final, null, 4), function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log("JSON saved into ./files/output.json");
      }
    });
  });


/**
 * a function that returns a base json based on header
 * @param {array} header - the header array
 * @return {object} the base json
 */
function getBase(header) {

  var obj = new Object(); // grant that each var is an different object

  for(let i = 0; i < header.length; i++)
  {
    if(header[i].includes('email') || header[i].includes('phone')) {
      if(!('addresses' in obj)){
        obj['addresses'] = new Array(); //init address
      }
      if(header[i].includes('email')) { // define type
        var type = 'email';
      }
      else {
        var type = 'phone';
      }
      header[i] = header[i].replace('email ', ''); //remove the type in the string
      header[i] = header[i].replace('phone ', ''); //remove the type in the string

      header[i] = header[i].split(', ');

      var addressobj = new Object();
      addressobj.type = type;
      addressobj.tags = header[i];
      addressobj.address = '';

      obj["addresses"].push(addressobj);
    }
    else if(header[i] == 'class') {
      if(!('classes' in obj)){
        obj['classes'] = new Array(); // put the prop in the object
      }
    }
    else {
      obj[header[i]] = ''; // put the prop in the object
    }
  }

  return obj;
}

function getWhere(header) {
  var fullname = new Object();
  var eid = new Object();
  var invisible = new Object();
  var see_all = new Object();
  var classes = new Array();
  var emails = new Array();
  var phones = new Array();
  var where = new Array();

  for(let i = 0; i < header.length; i++)
  {
    if(header[i].includes('email') || header[i].includes('phone')) {
      if(header[i].includes('email')) {
        emails.push(i);
      }
      else{
        phones.push(i);
      }
    }
    else{
      switch (header[i]) {
        case 'class':
          classes.push(i);
          break;
        case 'eid':
          eid = i;
          break;
        case 'fullname':
          fullname = i;
          break;
        case 'invisible':
          invisible = i;
          break;
        case 'see_all':
          see_all = i;
          break;
        default:
          console.log("Erro: Entre em contato com o suporte");
      }
    }
  }

  where['eid']        = eid;
  where['fullname']   = fullname;
  where['invisible']  = invisible;
  where['see_all']    = see_all;
  where['classes']    = classes;
  where['emails']     = emails;
  where['phones']     = phones;

  return where;
}

/**
 * a function that returns the base json filled with content
 * @param {array} resultarray - the harray that contains all data
 * @param {array} base - the json to use as base
 * @return {object} the base json filled with data
 */
function fillData(resultarray, base) {

  var final = new Array(); // create an array to put all data

  for(let i = 0; i < resultarray.length; i++) {
    var newline = new Object(); // create an new base object for each iteration
    newline     = base;

    var place = (searchPersonByName(resultarray[i][0], final));
    if(place > -1) // if are already in the final array
    {

      // put all classes
      resultarray[i][2]                = resultarray[i][2].split(' / ').join(',').split(', '); // separate classes if has / or ,
      resultarray[i][3]                = resultarray[i][3].split(' / ').join(',').split(', '); // separate classes if has / or ,
      var temp                         = resultarray[i][2].concat(resultarray[i][3]); // concat 2 arrays of classes
      temp                             = temp.filter(function(e){ return e.replace(/(\r\n|\n|\r)/gm,"")}); // remove empty values from array
      for (let i = 0; i < temp.length; i++) {
        final[place]["classes"].push(temp[i]);
      }

      //filter the address (email)
      var emails = resultarray[i][4].split('/'); // separate emails if has /
      if(emails.length > 1) {
        for (let i = 0; i < emails.length; i++) {
          if(validateEmail(emails[i])) {
            var newobject = new Object(); // create new object
            newobject = JSON.parse(JSON.stringify(newline["addresses"][0])); // use this object but not with reference
            newobject.address = emails[i]; // put the address
            final[place]["addresses"].push(newobject); // put into addresses
          }
        }
      }
      else {
        if(validateEmail(resultarray[i][4])) { // if is an valid email
          var newobject = new Object(); // create new object
          newobject = JSON.parse(JSON.stringify(newline["addresses"][0])); // use this object but not with reference
          newobject.address = resultarray[i][4]; // put the address
          final[place]["addresses"].push(newobject); // put into addresses
        }
      }

      //put the address (phone)
      if(filterTel(resultarray[i][5])) { // if is an valid tel
        var newobject = new Object(); // create new object
        newobject = JSON.parse(JSON.stringify(newline["addresses"][1])); // use this object but not with reference
        newobject.address = filterTel(resultarray[i][5]); // put the address
        final[place]["addresses"].push(newobject); // put into addresses
      }

      //put the address (phone)
      if(filterTel(resultarray[i][6])) { // if is an valid tel
        var newobject = new Object(); // create new object
        newobject = JSON.parse(JSON.stringify(newline["addresses"][2])); // use this object but not with reference
        newobject.address = filterTel(resultarray[i][6]); // put the address
        final[place]["addresses"].push(newobject); // put into addresses
      }

      //filter the address (email)
      var emails = resultarray[i][7].split('/'); // separate emails if has /
      if(emails.length > 1) {
        for (let i = 0; i < emails.length; i++) {
          if(validateEmail(emails[i])) {
            var newobject = new Object(); // create new object
            newobject = JSON.parse(JSON.stringify(newline["addresses"][3])); // use this object but not with reference
            newobject.address = emails[i]; // put the address
            final[place]["addresses"].push(newobject); // put into addresses
          }
        }
      }
      else {
        if(validateEmail(resultarray[i][7])) { // if is an valid email
          var newobject = new Object(); // create new object
          newobject = JSON.parse(JSON.stringify(newline["addresses"][3])); // use this object but not with reference
          newobject.address = resultarray[i][7]; // put the address
          final[place]["addresses"].push(newobject); // put into addresses
        }
      }

      //filter the address (email)
      var emails = resultarray[i][8].split('/'); // separate emails if has /
      if(emails.length > 1) {
        for (let i = 0; i < emails.length; i++) {
          if(validateEmail(emails[i])) {
            var newobject = new Object(); // create new object
            newobject = JSON.parse(JSON.stringify(newline["addresses"][4])); // use this object but not with reference
            newobject.address = emails[i]; // put the address
            final[place]["addresses"].push(newobject); // put into addresses
          }
        }
      }
      else {
        if(validateEmail(resultarray[i][8])) { // if is an valid email
          var newobject = new Object(); // create new object
          newobject = JSON.parse(JSON.stringify(newline["addresses"][4])); // use this object but not with reference
          newobject.address = resultarray[i][8]; // put the address
          final[place]["addresses"].push(newobject); // put into addresses
        }
      }

      //put the address (phone)
      if(filterTel(resultarray[i][9])) { // if is an valid tel
        var newobject = new Object(); // create new object
        newobject = JSON.parse(JSON.stringify(newline["addresses"][5])); // use this object but not with reference
        newobject.address = filterTel(resultarray[i][9]); // put the address
        final[place]["addresses"].push(newobject); // put into addresses
      }

      //put the invisible
      if((final[place]["invisible"] == false) && (resultarray[i][10] == '1' || resultarray[i][10] == 'yes' || resultarray[i][10] == true)) {
        final[place]["invisible"]   = true // put the invisible into array
      }

      //filter see_all
      if((final[place]["see_all"] == false) && (resultarray[i][11] == '1' || resultarray[i][11] == 'yes' || resultarray[i][11] == true)) {
        final[place]["see_all"]   = true // put the invisible into array
      }
    }
    else {
      // put name and eid
      newline["fullname"]              = resultarray[i][0]; // put the name into array
      newline["eid"]                   = resultarray[i][1]; // put the eid into array


      // filter classes
      resultarray[i][2]                = resultarray[i][2].split(' / ').join(',').split(','); // separate classes if has / or ,
      resultarray[i][3]                = resultarray[i][3].split(' / ').join(',').split(','); // separate classes if has / or ,
      newline["classes"]               = resultarray[i][2].concat(resultarray[i][3]); // concat 2 arrays of classes
      newline["classes"]               = newline["classes"].filter(function(e){ return e.replace(/(\r\n|\n|\r)/gm,"")}); // remove empty values from array
      if(newline["classes"].length == 1) {
        newline["classes"] = newline["classes"][0];
      }

      //filter the address (email)
      if(validateEmail(resultarray[i][4])) { // if is an valid email
        var hasAddress = searchAddress(resultarray[i][4], newline["addresses"]); // verify if the address already exists
        if(hasAddress) {
          for (let i = 0; i < newline["addresses"][0]["tags"].length; i++) {
            newline["addresses"][hasAddress]["tags"].push(newline["addresses"][0]["tags"][i]); // just put all tags together
          }
        }
        else {
          newline["addresses"][0].address = resultarray[i][4]; // // put the address into array
        }
      }
      else {
        newline["addresses"][0].address = ''; // set address as null
      }

      //filter the address (phone)
      if(filterTel(resultarray[i][5])) { // if is an valid tel
        resultarray[i][5] = filterTel(resultarray[i][5]);
        newline["addresses"][1].address  = resultarray[i][5]; // put the address into array
      }
      else {
        newline["addresses"][1].address  = '' ;
      }


      //filter the address (phone)
      if(filterTel(resultarray[i][6])) { // if is an valid tel
        resultarray[i][6] = filterTel(resultarray[i][6]);
        newline["addresses"][2].address  = resultarray[i][6]; // put the address into array
      }
      else {
        newline["addresses"][2].address  = '' ;
      }

      //filter the address (email)
      if(validateEmail(resultarray[i][7])) { // if is an valid email
        var hasAddress = searchAddress(resultarray[i][7], newline["addresses"]); // verify if the address already exists
        if(hasAddress) {
          for (let i = 0; i < newline["addresses"][3]["tags"].length; i++) {
            newline["addresses"][hasAddress]["tags"].push(newline["addresses"][3]["tags"][i]); // just put all tags together
          }
        }
        else {
          newline["addresses"][3].address = resultarray[i][7]; // // put the address into array
        }
      }
      else {
        newline["addresses"][3].address = ''; // set address as null
      }


      //filter the address (email)
      if(validateEmail(resultarray[i][8])) { // if is an valid email
        var hasAddress = searchAddress(resultarray[i][8], newline["addresses"]); // verify if the address already exists
        if(hasAddress) {
          for (let i = 0; i < newline["addresses"][4]["tags"].length; i++) {
            newline["addresses"][hasAddress]["tags"].push(newline["addresses"][4]["tags"][i]); // just put all tags together
          }
        }
        else {
          newline["addresses"][4].address = resultarray[i][8]; // // put the address into array
        }
      }
      else {
        newline["addresses"][4].address = '';
      }

      //filter the address (phone)
      if(filterTel(resultarray[i][9])) { // if is an valid tel
        resultarray[i][9] = filterTel(resultarray[i][9]);
        newline["addresses"][5].address  = resultarray[i][9]; // put the address into array
      }
      else {
        newline["addresses"][5].address = '';
      }


      //filter the invisible
      if(resultarray[i][10] == '' || resultarray[i][10] == '0' || resultarray[i][10] == 'no') {
        newline["invisible"]             = false // put the invisible into array
      }
      else {
        newline["invisible"]             = true // put the invisible into array
      }


      //filter see_all
      if(resultarray[i][11] == '' || resultarray[i][11] == '0' || resultarray[i][11] == 'no') {
        newline["see_all"]               = false // put the invisible into array
      }
      else {
        newline["see_all"]               = true // put the invisible into array
      }

      var json = JSON.stringify(newline); // convert into string json
      var json = JSON.parse(json); // convert into object json
      final.push(json); // put this json into final array

    }
  }
  // remove all null address in the last iteration
  final = removeAllNullAddress(final);

  return final;
}

/**
 * a function to search people in the array based on a name
 * @param {string} name - the name to search
 * @param {array} final - the array to serach
 * @return {integer} the index found, or -1 if not found
 */
function searchPersonByName(name, final) {
  for(let i = 0; i < Object.keys(final).length; i++) {
    if(final[i]["fullname"] == name) {
      return i;
    }
  }
  return -1;
}


/**
 * a function that verify if an number given is a valid number
 * @param {string} number - the number to verify
 * @return {mixed} the number filtered or -1 if not valid
 */
function filterTel(number) {
  try {
    number = phoneUtil.parse(number, 'BR');
  }
  catch(err) {
    number = phoneUtil.parse('123', 'BR');
  }

  if(phoneUtil.isValidNumberForRegion(number, 'BR')) {
    number = phoneUtil.format(number, PNF.E164); // format the number
    number = number.slice(1); // remove the plus sign
    return number;
  }
  else {
    return false;
  }
}

/**
  * a function that verify if an email is valid
  * @param {string} email - the email to verify
  * @return {boolean} true or false
  */
function validateEmail(email)
{
  var re = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
  return re.test(email);
}

/**
  * a function to remove all objects that has null address
  * @param {array} array - array to revove objects
  * @return {array} new array with no null addresses
  */
function removeAllNullAddress(array) {
  for (let i = 0; i < array.length; i++) {
    for (let j = 0; j < array[i]["addresses"].length; j++) {
      if((array[i]["addresses"][j]["address"]) == '') {
        array[i]["addresses"][j] = ''; // set all null address as null in addresses
      }
    }
  }

  for (let i = 0; i < array.length; i++) {
    for (var j = 0; j < array[i]["addresses"].length; j++) {
      if((array[i]["addresses"][j]) == '' || (array[i]["addresses"][j]) == null) {
        array[i]["addresses"].splice(j, 1); // remove all null content un addresses
        j = -1; // start searching again, because now the array size is different
      }
    }
  }

  return array;
}


/**
 * a function to search address in array
 * @param {string} address - the address to search
 * @param {array} addresses - the array to search the address
 * @return {mixed} index if found, false if not found
 */
function searchAddress(address, addresses)  {
  for (var i = 0; i < addresses.length; i++) {
    if(addresses[i].address == address)
    {
      return i;
    }
  }
  return false;
}
