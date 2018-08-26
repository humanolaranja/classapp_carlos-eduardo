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
function getBase(header) {

  var obj = new Object(); // grant that each var is an different object

  for(let i = 0; i < header.length; i++)
  {
    if(header[i].includes('email') || header[i].includes('phone')) {
      if(!('addresses' in obj))
        obj['addresses'] = new Array(); //init address
      if(header[i].includes('email'))
        var type = 'email';
      else
        var type = 'phone';
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


/**
 * a function that returns where the columns are
 * @param {array} header - the header array
 * @return {array} the where array
 */
function getWhere(header) {
  var where = new Array();
  where["classes"] = new Array();
  where["emails"] = new Array();
  where["phones"] = new Array();

  for(let i = 0; i < header.length; i++)
  {
    if(header[i].includes('email')) {
      where["emails"].push(i);
    }
    else if(header[i].includes('phone')){
      where["phones"].push(i);
    }
    else {
      if(header[i] == 'class') {
        where["classes"].push(i);
      }
      else {
        where[header[i]] = i;
      }
    }
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
function fillData(resultarray, base, where) {
  var final = new Array(); // create an array to put all data
  for(let i = 0; i < resultarray.length; i++) {
    var newline = new Object(); // create an new base object for each iteration
    newline     = base;

    var place = (searchPersonByName(resultarray[i][where["fullname"]], final));
    if(place > -1) // if are already in the final array
    {
      //filter Addresses
      var countWherePhone = 0;
      var countWhereEmail = 0;
      for (let j = 0; j < newline["addresses"].length; j++) {
        var newobject = new Object(); // create new object
        newobject = JSON.parse(JSON.stringify(newline["addresses"][j])); // use this object but not with reference
        if(newline["addresses"][j].type == 'phone'){
          newobject.address = filterAddress('phone', resultarray[i][where['phones'][countWherePhone]]); // put the address
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

      // put all classes
      var temp = Array();
      for (let j = 0; j < where["classes"].length; j++) {
        resultarray[i][where["classes"][j]]                = resultarray[i][where["classes"][j]].split(' / ').join(',').split(', '); // separate classes if has / or ,
        temp.push(resultarray[i][where["classes"][j]]);
      }
      temp  = _.flattenDeep(temp);
      temp  = temp.filter(function(e){ return e.replace(/(\r\n|\n|\r)/gm,"")}); // remove empty values from array
      for (let i = 0; i < temp.length; i++)
        final[place]["classes"].push(temp[i]);

      //put the invisible
      if((final[place]["invisible"] == false) && (resultarray[i][where["invisible"]] == '1' || resultarray[i][where["invisible"]] == 'yes' || resultarray[i][where["invisible"]] == true))
        final[place]["invisible"]   = true // put the invisible into array

      //filter see_all
      if((final[place]["see_all"] == false) && (resultarray[i][where["see_all"]] == '1' || resultarray[i][where["see_all"]] == 'yes' || resultarray[i][where["see_all"]] == true))
        final[place]["see_all"]   = true // put the invisible into array
    }
    else {
      // put name and eid
      newline["fullname"]              = resultarray[i][where["fullname"]]; // put the name into array
      newline["eid"]                   = resultarray[i][where["eid"]]; // put the eid into array

      //filter Addresses
      var countWherePhone = 0;
      var countWhereEmail = 0;
      for (let j = 0; j < newline["addresses"].length; j++) {
        if(newline["addresses"][j].type == 'phone'){
          newline["addresses"][j].address = filterAddress('phone', resultarray[i][where['phones'][countWherePhone]]);
          countWherePhone++;
        }
        else{
          if(filterAddress('email', resultarray[i][where['emails'][countWhereEmail]])) { // if is an valid email
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

      newline["classes"] = Array();
      // filter classes
      for (let j = 0; j < where["classes"].length; j++) {
        resultarray[i][where["classes"][j]] = resultarray[i][where["classes"][j]].split(' / ').join(',').split(','); // separate classes if has / or ,
        newline["classes"].push(resultarray[i][where["classes"][j]]);
      }
      newline["classes"]    = _.flattenDeep(newline["classes"]);
      newline["classes"]    = newline["classes"].filter(function(e){ return e.replace(/(\r\n|\n|\r)/gm,"")}); // remove empty values from array
      if(newline["classes"].length == 1) {
        newline["classes"]  = newline["classes"][0];
      }

      //filter the invisible
      if(resultarray[i][where["invisible"]] == '' || resultarray[i][where["invisible"]] == '0' || resultarray[i][where["invisible"]] == 'no')
        newline["invisible"]             = false // put the invisible into array
      else
        newline["invisible"]             = true // put the invisible into array

      //filter see_all
      if(resultarray[i][where["see_all"]] == '' || resultarray[i][where["see_all"]] == '0' || resultarray[i][where["see_all"]] == 'no')
        newline["see_all"]               = false // put the invisible into array
      else
        newline["see_all"]               = true // put the invisible into array

      var json = JSON.stringify(newline); // convert into string json
      final.push(JSON.parse(json)); // put this json into final array
    }
  }
  final = removeAllNullAddress(final); // remove all null address in the last iteration
  return final;
}

/**
 * a function to search people in the array based on a name
 * @param {string} name - the name to search
 * @param {array} final - the array to serach
 * @return {integer} the index found, or -1 if not found
 */
function searchPersonByName(name, final) {
  for(let i = 0; i < Object.keys(final).length; i++)
    if(final[i]["fullname"] == name)
      return i;
  return -1;
}


/**
 * a function that verify if an number given is a valid number
 * @param {string} number - the number to verify
 * @return {mixed} the number filtered or -1 if not valid
 */
function filterTel(number) {
  try
    { number = phoneUtil.parse(number, 'BR'); }
  catch(err)
    { return false; }
  if(phoneUtil.isValidNumberForRegion(number, 'BR')) {
    number = phoneUtil.format(number, PNF.E164).slice(1); // format the number
    return number;
  }
  else
    return false;
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
  * @param {array} array - array to remove objects
  * @return {array} new array with no null addresses
  */
function removeAllNullAddress(array) {
  for (let i = 0; i < array.length; i++)
    for (var j = 0; j < array[i]["addresses"].length; j++)
      if((array[i]["addresses"][j]["address"]) == '' || (array[i]["addresses"][j]["address"]) == null || (array[i]["addresses"][j]["address"]) == false) {
        array[i]["addresses"].splice(j, 1); // remove all null content un addresses
        j = -1; // start searching again, because now the array size is different
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
  for (var i = 0; i < addresses.length; i++)
    if(addresses[i].address == address)
      return i;
  return false;
}

/**
 * a function to filter address
 * @param {string} type - the address type
 * @param {array} content - the content to filter
 * @return {string} filtered content
 */
function filterAddress(type, content)  {
  switch (type) {
    case 'phone':
      return filterTel(content);
    case 'email':
      return validateEmail(content);
  }
}
