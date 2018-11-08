/*
 * Copyright 2005-2018 The Kuali Foundation
 *
 * Licensed under the Educational Community License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.opensource.org/licenses/ecl2.php
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * edoclite validation functions
 * http://www.quirksmode.org/js/introevents.html for background on javascript event quagmire
 *
 * How It All Works
 *
 * This script is called on page load (onPageLoad).  It will register onblur and onchange handlers (probably only
 * onblur is necessary at this time, but it started with just onchange) for fields which have been pre-registered
 * in java script blocks in the incoming document.  The pre-registration supplies a field name which must match a form
 * input name, a regular expression, and an optional error message.  The handlers will fire when the form fields
 * are tabbed-out and unhide a CSS-hidden message row on which a specific CSS style is set depending on warning or error,
 * to color the row appropriately.  A warning/error message is set in this row.  The secret row must have ids like:
 *
 * <fieldname>_message - the message element (typically a <span>)
 * <fieldname>_messageHeaderCell - the "header" cell of the message row (containing label warning/error)
 * <fieldname>_messageDataCell - the "data" cell of the message row (containing the actual message)
 * <fieldname>_messageRow - the entire row for any other decoration
 *
 * The CSS classes set on the header and data cells and message row, are respectively:
 *
 * <msgtype>_messageHeaderCell
 * <msgtype>_messageDataCell
 * <msgtype>_messageRow
 *
 * Where <msgtype> is either "warning", "error", or "empty" (which should just ensure that the elements are hidden regardless).
 *
 * A first-time pass at validation occurs on page load also, to ensure the user is notified ahead of time of field validation
 * requirements.  Fields which do NOT have validation requirements must be carefully omitted from pre-registration, so that fields
 * with outstanding errors generated by, for example, attributes, do NOT have their errors automatically implicitly cleared (the first
 * time pass would otherwise just default to an "accept-anything" regular expression, and immediately wipe out the error generated
 * on the server.  This underlines the importance of ensuring client-side JavaScript-based validation defined in the EDL document
 * is in sync with the ultimate attribute validation (or at least omitted to avoid false positive validation on the client side).
 *
 * Aaron Hamid (arh14 at cornell dot edu) 1/10/06
 */

// ---- globals

var nbsp = 160;    // non-breaking space char

var empty_regex = /^\s*$/

var field_titles = new Object;
var field_regexes = new Object;
var field_errorMessages = new Object;
var field_validationRequired= new Object;

var field_names = new Array;

// ---- utils

function setTextValue(id, text) {
    var element = document.getElementById(id);
    var node = element.firstChild;
    if (node == null) {
      node = document.createTextNode("");
      element.appendChild(node);
    }
    node.nodeValue = text;
}

function setClass(id, className) {
    document.getElementById(id).className = className;
}

// -----------------------------------------
//                  msg
// Display warn/error message in HTML element
// commonCheck routine must have previously been called
// -----------------------------------------

function setMessage(fld,     // id of element to display message in
             msgtype, // class to give element ("warn" or "error")
             message) // string to display
{
    // setting an empty string can give problems if later set to a
    // non-empty string, so ensure a space present. (For Mozilla and Opera one could
    // simply use a space, but IE demands something more, like a non-breaking space.)
    var dispmessage;
    if (empty_regex.test(message))
        dispmessage = String.fromCharCode(nbsp);
    else
        dispmessage = message;

    // set the text value of the message
    setTextValue(fld + "_message", dispmessage);
    // set the text value of the message header cell
    setTextValue(fld + "_messageHeaderCell", msgtype);
    // update messageHeaderCell class
    setClass(fld + "_messageHeaderCell", msgtype + "_messageHeaderCell");
    // update messageDataCell class
    setClass(fld + "_messageDataCell", msgtype + "_messageDataCell");
    // update the row class
    setClass(fld + "_messageRow", msgtype + "_messageRow");
};

function getTarget(event) {
    var target;
    if (event.target) target = event.target;
	  else if (event.srcElement) target = event.srcElement;
    if (target.nodeType == 3) // defeat Safari bug
		    target = target.parentNode;
    return target;
}

function registerHandlers() {
    //alert("Registering handlers");
    // register event handler
    for (var i in field_names) {
        var fieldName = field_names[i];
        //alert("registering handler for: " + fieldName);
        var element = document.getElementById('edoclite')[fieldName];
        element.onchange = validate;
        element.onblur = validate;
        if (element.captureEvents) element.captureEvents(Event.CHANGE);
    }
}

/**
 * Registers an event handler in the "traditional" method
 * and fills in global regex, message, and validationRequired maps
 */
function register(name, title, regex, message, validationRequired) {
    //alert("registering " + name + " " + regex + " " + message + " " + validationRequired);
    field_names.push(name);

    // set the title for this field
    field_titles[name] = title;

    // set the regex for this field
    field_regexes[name] = regex;

    // set the error message for this field
    field_errorMessages[name] = message;

    // set the error message for this field
    field_validationRequired[name] = validationRequired == "true";
}

function isValidationRequired(fieldName) {
    /*if (field_validationRequired[fieldName]) {
      alert("validation required: " + fieldName + " " + field_validationRequired[fieldName]);
    } else {
      //alert("validation NOT required: " + fieldName + " " + field_validationRequired[fieldName]);
    }*/
    return field_validationRequired[fieldName];
}

// ---- validation

function trim(string) {
    return string.replace(/^\s+/m, "") // strip leading
                 .replace(/\s+$/m, ""); // strip trailing
}

function isValid(element, regex, required) {
    //alert("isValid: " + element);
    //alert("regex for " + element.name + ": " + regex);
    //alert("element value: '" + element.value + "'");
    if (regex == null || regex == "") {
        //alert("no regex for " + element.name);
        if (required) {
            //alert("element value: " + element.value);
            return element.value != null && trim(element.value).length > 0;
        } else {
            return true;
        }
    } else {
        return element.value.match(regex);
    }
    //return false;
}

//function validate(event, regex, message) {
function validate(event) {
    //alert("validate event: " + event);
    if (!event) var event = window.event;
    // event gives access to the event in all browsers
    validateField(getTarget(event));
}

function validateField(target) {
    try {
        var regex = field_regexes[target.name];
        var required = isValidationRequired(target.name);
        var message = "";
        var type = "empty";
        var valid = isValid(target, regex, required);
        if (!valid) {
            // set a color instead and then pop up summary alert on submit
            // if there are any fields which fail validation
            // but are required="true" in the bizdata
            message = field_errorMessages[target.name];
            var error_element = document.getElementById(target.name + "_message");
            if (error_element == null) {
                alert("Could not find error element by id: " + target.name + "_message");
            } else {
              if (message.length == 0) {
                if (regex == null || regex == "") {
                    var title = field_titles[target.name];
                    if (title == null) {
                        title = target.name;
                    }
                    message = "field '" + title + "' is required";
                } else {
                  message = target.value + " does not match " + regex;
                }
              }
              if (required) {
                type = "error";
              } else {
                type = "warning";
              }
            }
        }

    } catch (error) {
        message = "Error validating target " + target + ": " + error;
        type = "error";
        //alert(message);
        valid = false;
    }
    setMessage(target.name, type, message);
    return valid;
}

function validateForm() {
    //alert("validating form");
    var errs = 0;
//    var form = document.getElementById('edoclite');
//    for (var i in form.elements) {
//        var field = form.elements[i];
//        if (field_validationRequired[field.name] == null) {
//            //alert("no mapping for field: " + field.name);
//            continue;
//        }
//        //alert("validating field: " + field);
//        if (!validateField(field)) {
//            //alert("field " + field.name + " is invalid");
//            if (isValidationRequired(field.name)) {
//                errs += 1;
//                //alert("and was required (errs: " + errs + ")");
//            }
//        }
//    }
       
    for (var i in field_names) {
        var fieldName = field_names[i];
        var element = document.getElementById('edoclite')[fieldName];
        //alert("validating form element: " + element.name);
        if (!validateField(element)) {
           // alert("field " + element.name + " is invalid");
            if (isValidationRequired(element.name)) {
                errs += 1;
              //  alert("and was required (errs: " + errs + ")");
            }
        }
    }
    //alert("validateForm errs: " + errs);
    return errs;
}

function validateOnSubmit() {
    //alert("validating on submit");
    var errs = validateForm();
    //alert("Errs: " + errs);
    if (errs > 1)  alert('There are fields which require correction before sending');
    else if (errs == 1) alert('There is a field which requires correction before sending');

    return (errs == 0);
}

/**
 * Called when the page is loaded
 * Registers handlers for fields and then
 * performs an initial validation pass (but does not display alert dialog)
 */
function onPageLoad() {
    registerHandlers();
    // commented out for now
    // validateForm();
}
