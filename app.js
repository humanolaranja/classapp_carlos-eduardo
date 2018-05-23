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
    console.log(JSON.stringify(final)); // print the final josn
  });


/**
  *
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

/**
  *
  *
  */
function fillData(resultarray, base) {

  var final = new Array(); // create an array to put all data

  for(let i = 0; i < resultarray.length; i++) {
    var newline = new Object(); // create an new base object for each iteration
    newline     = base;

    if((searchPersonByName(resultarray[i][0], final)) > -1)
    {
      // console.log("Já tem");
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

      //filter the address
      if(filterTel(resultarray[i][4])) {
        resultarray[i][4] = filterTel(resultarray[i][4]);
        newline["addresses"][0].address  = resultarray[i][4]; // put the address into array
      }
      if(filterTel(resultarray[i][5])) {
        resultarray[i][5] = filterTel(resultarray[i][5]);
        newline["addresses"][1].address  = resultarray[i][5]; // put the address into array
      }
      if(filterTel(resultarray[i][6])) {
        resultarray[i][6] = filterTel(resultarray[i][6]);
        newline["addresses"][2].address  = resultarray[i][6]; // put the address into array
      }
      if(filterTel(resultarray[i][7])) {
        resultarray[i][7] = filterTel(resultarray[i][7]);
        newline["addresses"][3].address  = resultarray[i][7]; // put the address into array
      }
      if(filterTel(resultarray[i][8])) {
        resultarray[i][8] = filterTel(resultarray[i][8]);
        newline["addresses"][4].address  = resultarray[i][8]; // put the address into array
      }
      if(filterTel(resultarray[i][9])) {
        resultarray[i][9] = filterTel(resultarray[i][9]);
        newline["addresses"][5].address  = resultarray[i][9]; // put the address into array
      }

      //filter the result
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
    }

    var json = JSON.stringify(newline); // convert into string json
    var json = JSON.parse(json); // convert into object json
    final.push(json); // put this json into final array
  }

  return final;
}

/**
  *
  *
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
  *
  *
  */
function filterTel(number) {
  try {
    number = phoneUtil.parse(number, 'BR');
  }
  catch(err) {
    number = phoneUtil.parse('123', 'BR');
  }

  if(phoneUtil.isPossibleNumber(number)) {
    number = phoneUtil.format(number, PNF.E164); // format the number
    number = number.slice(1); // remove the plus sign
    return number;
  }
  else {
    return false;
  }
}
