Robo scripts reference guide

bookmark_border


This document provides reference information about Robo scripts including structure, capabilities, usage, recording, and actions. Robo scripts are tests that automate manual quality assurance (QA) tasks for mobile apps, and enable continuous integration (CI) and pre-launch testing strategies. A Robo script is a JSON file that describes a sequence of user interface (UI) and other actions.

You can create a Robo script in the following ways:

Use the Robo script recording feature. (Android only)

Create the Robo script manually. (Android and iOS+)

Record the Robo script and then edit it manually. (Android only)

To learn more about using Robo scripts, see Run a Robo script.

Introduction
Robo script is provided to Robo test alongside other inputs like the app-under-test Android Application Package (APK).

The following is an example of a Robo script that signs a user into an app, which is triggered when the app-under-test is launched:


[
  {
    "crawlStage": "crawl",
    "contextDescriptor": {
      "condition": "app_under_test_shown"
    },
    "actions": [
      {
        "eventType": "VIEW_TEXT_CHANGED",
        "replacementText": "user123",
        "elementDescriptors": [
          {
            "resourceId": "my.app.package:id/username"
          }
        ]
      },
      {
        "eventType": "VIEW_TEXT_CHANGED",
        "replacementText": "12345",
        "elementDescriptors": [
          {
            "resourceId": "my.app.package:id/password"
          }
        ]
      },
      {
        "eventType": "VIEW_CLICKED",
        "elementDescriptors": [
          {
            "resourceId": "my.app.package:id/login"
          }
        ]
      }
    ]
  }
]
If there is a single Robo script in a file and it has the default app_under_test_shown triggering condition, as in the example above, then you can specify the Robo script in a file using a simpler format - just as a sequence of its actions:


[
  {
    "eventType": "VIEW_TEXT_CHANGED",
    "replacementText": "user123",
    "elementDescriptors": [
      {
        "resourceId": "my.app.package:id/username"
      }
    ]
  },
  {
    "eventType": "VIEW_TEXT_CHANGED",
    "replacementText": "12345",
    "elementDescriptors": [
      {
        "resourceId": "my.app.package:id/password"
      }
    ]
  },
  {
    "eventType": "VIEW_CLICKED",
    "elementDescriptors": [
      {
        "resourceId": "my.app.package:id/login"
      }
    ]
  }
]
iOS+ support for Robo scripts
Robo for iOS+ (Beta) has limited support for Robo scripts. The Robo script syntax for iOS+ is identical to Android syntax, and supported iOS+ features behave similarly to their Android counterparts.

Note: Robo for iOS+ is a beta release. This means that the functionality might change in backward-incompatible ways. A beta release is not subject to any SLA or deprecation policy and may receive limited or no support.
The following actions are supported in iOS+:

Assertion
Click
Long click
Swipe
Ignore all element(s)
Wait
Take screenshot
Terminate crawl
The following identifying attributes in element descriptors are supported in iOS+:

Class name
Ancestor class name
Content description (and regex)
Text (and regex)
The following triggering conditions in context descriptors are supported in iOS+:

App under test shown
Element present
Non-Robo script action performed
Structure
A Robo script has several attributes that describe how Robo executes it. Most of these attributes are optional with predefined default values:

Attribute    Description
id    An integer number that helps track this Robo script in crawl outputs. Robo has built-in Robo scripts with their own ids. Although the same id in different Robo scripts does not affect their behavior, distinguishing actions from these Robo scripts in crawl outputs can be challenging. We recommend assigning a unique id of 1000 or higher for your Robo scripts to avoid any conflicts.
description    Similar to id but more descriptive.
crawlStage    The stage of a crawl Robo applies this Robo script at. By default, it is the main crawl stage.
priority    The priority of this Robo script in comparison to other Robo scripts. By default, all Robo scripts have a priority of 1.
maxNumberOfRuns    Specifies how many times during a crawl Robo can execute this Robo script. By default, Robo can execute a Robo script one time.
contextDescriptor    Describes the context or condition that triggers this Robo script. If omitted, this Robo script's triggering condition is considered to be always met; in other words, the Robo script is unconditional.
actions    All actions of this Robo script.
A single file contains a collection of one or more Robo scripts.

The following is an example of a file with two unconditional Robo scripts, each with a single action that is executed once at the beginning of a crawl:


[
  {
    "id": 1000,
    "description": "My first Robo script",
    "actions": [
      {
        "eventType": "DISABLE_KEYBOARD"
      }
    ]
  },
  {
    "id": 1001,
    "description": "My second Robo script",
    "actions": [
      {
        "eventType": "PRESSED_BACK"
      }
    ]
  }
]
Context descriptor
A context descriptor defines the context or condition that triggers a Robo script using one or a combination of several attributes:

Attribute    Description
"condition": "always"    Always triggers a Robo script.
"condition": "element_present"    Checks that a UI widget that matches elementDescriptors or text specified by visionText is present on the screen.
"condition": "element_disabled"    Checks that a UI widget that matches elementDescriptors is present on the screen and cannot be interacted with.
"condition": "element_checked"    Checks that a UI widget that matches elementDescriptors is present on the screen and is checked.
"condition": "app_under_test_shown"    Checks that the app-under-test is running in the foreground.
"condition": "default_launcher_shown"    Checks that a device's home screen is shown, which means that no apps are running in the foreground.
"condition": "non_roboscript_action_performed"    Checks that the last nonRoboscriptActionCount consecutive actions performed by Robo test are not Robo script actions.
negateCondition    If set to true, negates the condition. For example, you can use this attribute to check if a UI widget is NOT present on the screen, or that the app-under-test is NOT running in the foreground.
elementDescriptors    One or more element descriptors that identify a UI widget on the screen. It is used in combination with the element_present, element_disabled, and element_checked conditions. Mutually exclusive with visionText. For more information, see Element descriptors.
visionText    Text on the screen is detected using the Optical Character Recognition (OCR) API. visionText is used in combination with the element_present condition. Mutually exclusive with elementDescriptors.
nonRoboscriptActionCount    The number of consecutive non-Robo script actions performed prior. It is used in combination with the non_roboscript_action_performed condition to trigger a Robo script after every nonRoboscriptActionCount Robo actions. By default, it is 1.
The following is an example of a Robo script that is triggered by a UI widget with a resource ID "my.app.package:id/page_header" being present on the screen:


{
  "id": 1000,
  "contextDescriptor": {
    "condition": "element_present",
    "elementDescriptors": [
      {
        "resourceId": "my.app.package:id/page_header"
      }
    ]
  },
  "actions": [
    {
      "eventType": "VIEW_CLICKED",
      "elementDescriptors": [
        {
          "text": "Settings"
        }
      ]
    }
  ]
}
The following is an example of a Robo script that is triggered by "Privacy Policy" detected by Optical Character Recognition (OCR):


{
  "id": 1000,
  "description": "Vision text Robo script",
  "contextDescriptor": {
    "condition": "element_present",
    "visionText": "Privacy Policy"
  },
  "actions": [
    {
      "eventType": "VIEW_CLICKED",
      "visionText": "Privacy Policy"
    }
  ]
}
The following is an example of a Robo script that waits for 5 seconds after every non-script Robo action:


{
  "contextDescriptor": {
    "condition": "non_roboscript_action_performed"
  },
  "maxNumberOfRuns" : 1000,
  "actions" : [
    {
      "eventType" : "WAIT",
      "delayTime" : 5000
    }]
}
Actions
Each action in a Robo script is represented as a bundle of one or more attribute-value pairs, which are described in the following table:

Attribute    Description
eventType    Specifies the type of the action, for example, click, text edit, etc. Required for every action.
elementDescriptors    Descriptors that identify a UI widget. Required for all actions that have a target UI widget, like clicking a particular button.
optional    If set to true, this action is skipped when it cannot be performed. For example, this action is skipped when it can't find its target UI widget on a screen– without failing the containing Robo script. By default, the value is false.
replacementText    The text to input into the target UI widget. Required for text editing actions.
swipeDirection    Specifies the direction of the swipe. Required for swipe actions.
delayTime    Specifies how long to wait, in milliseconds. Required for wait actions.
pointTapXCoordinate and pointTapYCoordinate    The pixel X and Y coordinates of the tapped point. Mutually exclusive with pointTapXPercent and pointTapYPercent. Required for point tap actions.
pointTapXPercent and pointTapYPercent    The percentage X and Y coordinates of the tapped point. Mutually exclusive with pointTapXCoordinate and pointTapYCoordinate. Required for point tap actions.
The following is an example of a Robo script with two actions without target UI widgets, which means that these actions don't operate on a specific UI widget:


[
  {
    "eventType": "WAIT",
    "delayTime": 3000
  },
  {
    "eventType": "PRESSED_BACK"
  }
]
Element descriptors
An element descriptor identifies a UI widget using one or more of the following identifying attributes:

Attribute    Description
className    –
ancestorClassName    Class name of the element's UI hierarchy ancestor. An ancestor is any of the parent nodes in the element's UI hierarchy, including the element itself.
resourceId    –
resourceIdRegex    Java regular expression to match resourceId.
contentDescription    –
contentDescriptionRegex    Java regular expression to match contentDescription.
text (that appears on the screen)    –
textRegex    Java regular expression to match text.
groupViewChildPosition, recyclerViewChildPosition, or adapterViewChildPosition    Represents a UI widget's child position depending on the kind of its parent widget.
Frequently, these attributes are undefined, for example, a button might not have text and content description. Even if some attribute values are present, they might not be unique on a given app screen (including resourceId).

For example, differentiating between items of a list is commonly possible only by using their different child positions within their parent widget. This means that using just one element descriptor to identify a UI widget is usually insufficient. Therefore, an action's elementDescriptors attribute contains a sequence of element descriptors that are ordered such that the first one corresponds to the target UI widget, the second one corresponds to the target UI widget's parent widget, and so on. An action's target UI widget is matched when all of its element descriptors match the corresponding UI widget sub-hierarchy.

The following is an example of a Robo script with a text change and click actions, both of which require you to identify the target UI widget using the provided element descriptors:


[
  {
    "eventType": "VIEW_TEXT_CHANGED",
    "replacementText": "John",
    "elementDescriptors": [
      {
        "className": "android.support.v7.widget.AppCompatEditText",
        "groupViewChildPosition": 0,
        "resourceId": "com.google.samples.apps.topeka:id/first_name"
      },
      {
        "className": "android.widget.FrameLayout",
        "groupViewChildPosition": 0
      },
      {
        "className": "android.support.design.widget.TextInputLayout",
        "groupViewChildPosition": 1
      }
    ]
  },
  {
    "eventType": "VIEW_CLICKED",
    "elementDescriptors": [
      {
        "className": "android.support.design.widget.FloatingActionButton",
        "groupViewChildPosition": 1,
        "resourceId": "com.google.samples.apps.topeka:id/done"
      },
      {
        "className": "android.widget.FrameLayout",
        "groupViewChildPosition": 1,
        "resourceId": "com.google.samples.apps.topeka:id/content"
      },
      {
        "className": "android.widget.FrameLayout",
        "groupViewChildPosition": 0,
        "resourceId": "com.google.samples.apps.topeka:id/sign_in_content"
      }
    ]
  }
]
Execution options
You can optionally prefix the list of actions in a Robo script with a JSON object that specifies the execution options for that Robo script. This configuration header starts with the roboscript keyword followed by a JSON representation of the desired execution options.

Robo scripts support the following execution options:

executionMode - execution options applied when a Robo script is running:
strict - if set to true, Robo script does not employ partial matching, skipping current action, and suspension. That is, the Robo script is executed as a regular instrumentation test and fails as soon as any of its actions cannot be performed. By default, it is false.
dismiss_popups - if set to true, Robo test dismisses any unexpected dialogs while performing the Robo script even in strict mode. This option has no effect when not in strict mode. By default, it is false.
notify - if set to false, Robo script does not show on-screen notifications at the beginning and end of its execution. By default, it is true.
postscript - execution options applied after a Robo script is completed:
terminate - if set to true, Robo test stops crawling after the Robo script is completed. By default, it is false.
The following is an example of a Robo script executed in strict mode without on-screen notifications that waits for three seconds, after which the crawl stops:


"roboscript": {
  "executionMode": {
    "strict": true,
    "notify": false
  },
  "postscript": {
    "terminate": true
  }
}
[
  {
    "eventType": "WAIT",
    "delayTime": 3000
  }
]
Template parameters
A template parameter is a placeholder in a Robo script that is replaced with the actual value when Robo test loads that Robo script for execution. Template parameters are prefixed with a double underscore followed by a percent sign, and are postfixed with a percent sign followed by a double underscore.

Robo scripts support the following template parameter:

__%APP_PACKAGE_NAME%__ - the package name of the app-under-test.
The following is an example of a Robo script that stops the app-under-test process:


[
  {
    "eventType": "ADB_SHELL_COMMAND",
    "command": "am force-stop __%APP_PACKAGE_NAME%__"
  }
]
Comments
A Robo script can contain comment lines, which are lines that start with # or //.

The following is an example of a Robo script with a couple of comments:


# Confirm a user account.
[
  {
    // Click the DONE button.
    "eventType": "VIEW_CLICKED",
    "elementDescriptors": [
      {
        "resourceId": "com.google.samples.apps.topeka:id/done"
      }
    ]
  }
]
Capabilities
By default, until all actions of a Robo script are completed (or at least attempted), the Robo script remains active. Robo test keeps trying to match a Robo script action whenever it is picking an action to perform. Robo script employs the following techniques to increase robustness:

Technique    Description
Partial matching    If the current Robo script action cannot be fully matched, the matching criteria are relaxed and the matching is retried. The partial matching doesn't consider the outermost element descriptor while matching the target UI widget of a Robo script action.
If the partial matching succeeds, the corresponding Robo script action is performed as usual. This technique supports scenarios in which the app structure changes, for example, between app versions, when screen elements are rearranged.

Skip current action    If the current Robo script action cannot be fully or partially matched, Robo tries to match the subsequent Robo script action. If the subsequent action fully or partially matches, Robo test skips (and never returns to) the current Robo script action and performs the subsequent one.
This technique supports scenarios when app behavior changes between versions or is flaky, for example, when an intermittent dialog might appear at different screens during recording versus replaying of a Robo script.

Suspend    If neither current nor subsequent Robo script actions can be fully or partially matched, Robo script is temporarily suspended and Robo test picks an action to perform using its other strategies. After this action is completed, Robo test resumes executing the Robo script.
As long as current or subsequent Robo script actions cannot be matched, Robo script remains suspended for any number of actions. Thus, Robo scripts don't necessarily need to be a prologue for a Robo test, and you can intersperse Robo script actions with standard Robo test actions. This technique supports scenarios when app behavior is flaky, or when changes between app versions are large enough that Robo test needs to "fill in the gaps" with its standard actions.

Priorities
If a Robo script reaches its maxNumberOfRuns, it can no longer be triggered in a given crawl. If more than one Robo script can be triggered by the current context, priority is given by choosing, in the following order, the Robo script that:

Has a contextDescriptor attribute.
Has the highest priority (by default, all Robo scripts have the same execution priority of 1).
Appears earliest in the list of the Robo scripts, if Robo scripts' priorities are the same.
The following is an example of a file with three Robo scripts that perform the same action and are triggered by the same condition - the app-under-test being in the foreground:


[
  {
    "id": 1000,
    "description": "Robo script 1",
    "contextDescriptor": {
      "condition": "app_under_test_shown"
    },
    "actions": [
      {
        "eventType": "WAIT",
        "delayTime": 3000
      }
    ]
  },
  {
    "id": 1001,
    "description": "Robo script 2",
    "priority": "2",
    "contextDescriptor": {
      "condition": "app_under_test_shown"
    },
    "actions": [
      {
        "eventType": "WAIT",
        "delayTime": 3000
      }
    ]
  },
  {
    "id": 1002,
    "description": "Robo script 3",
    "contextDescriptor": {
      "condition": "app_under_test_shown"
    },
    "actions": [
      {
        "eventType": "WAIT",
        "delayTime": 3000
      }
    ]
  }
]
When the app-under-test is in the foreground, Robo triggers the following, in order:

"Robo script 2" because it has the highest priority.
"Robo script 1" because it appears earlier among the remaining applicable Robo scripts with the same priority.
"Robo script 3" as the last applicable Robo script.
Repeated runs
By default, Robo triggers a Robo script at most once during a crawl. This can be adjusted via the maxNumberOfRuns attribute.

The following is an example of a Robo script that brings the app-under-test into the background for up to 10 times:


{
  "id": 1000,
  "maxNumberOfRuns": 10,
  "contextDescriptor": {
    "condition": "app_under_test_shown"
  },
  "actions": [
    {
      "eventType": "GO_HOME"
    }
  ]
}
Crawl stage
Robo scripts are applicable at different stages of a given Robo crawl:

Crawl stage    Description
pre_crawl    Before Robo launches and starts crawling the app-under-test.
post_crawl    After Robo finishes crawling the app-under-test. A post_crawl Robo script must not exceed 15 seconds in duration or else the crawl may terminate in a timeout.
crawl    The main crawl stage, when Robo crawls the app-under-test.
close_screen    When Robo tries to return back (backtrack) from a given screen, when all possible actions on this screen are explored. By default, Robo presses back, which is undesirable in some scenarios.
If the crawlStage attribute of a Robo script is unspecified, it is implied to be crawl.

The following is an example of a Robo script that clears the app-under-test user data before Robo starts crawling it:


{
  "id": 1000,
  "crawlStage": "pre_crawl",
  "actions": [
    {
      "eventType": "ADB_SHELL_COMMAND",
      "command": "pm clear __%APP_PACKAGE_NAME%__"
    }
  ]
}
The following is an example of a Robo script that instructs Robo to click "Cancel" whenever it tries to return back (backtrack) from a confirmation dialog:


{
  "id": 1000,
  "crawlStage": "close_screen",
  "maxNumberOfRuns": 999,
  "contextDescriptor": {
    "condition": "element_present",
    "elementDescriptors": [
      {
        "resourceId": "my.app.package:id/confirmation_dialog"
      }
    ]
  },
  "actions": [
    {
      "eventType": "VIEW_CLICKED",
      "elementDescriptors": [
        {
          "text": "Cancel"
        }
      ]
    }
  ]
}
Conditional actions
A Robo script can contain conditional actions. Conditional actions have three additional attributes that describe how Robo performs them:

Attribute    Description
priority    The priority of this conditional action in comparison to other conditional actions within its containing Robo script. By default, all conditional actions have a priority of 1.
maxNumberOfRuns    How many times this conditional action can be performed during one execution of its containing Robo script. By default, all conditional actions can be performed at most once in a single execution of their containing Robo script.
contextDescriptor    The context/condition that triggers this conditional action. It has the same structure and offers similar capabilities as the Robo script's contextDescriptor
When triggered, a Robo script performs its non-conditional actions one by one in order of appearance. If a Robo script contains conditional actions, then they are considered every time before picking a non-conditional action to perform. If any conditional action is triggered and picked based on its priority and the remaining number of runs, then the Robo script performs this conditional action. Otherwise, the Robo script performs the following non-conditional action. To be valid, a Robo script must contain at least one non-conditional action.

The following is an example of an unconditional Robo script with a conditional action that dismisses popup dialogs if they show up at any point during the Robo script execution:


{
  "id": 1000,
  "actions": [
    {
      "description": "Dismiss popup",
      "maxNumberOfRuns": 100,
      "contextDescriptor": {
        "condition": "default_launcher_shown",
        "negateCondition": true
      },
      "eventType": "GO_HOME"
    },
    {
      "description": "Screen off",
      "eventType": "ADB_SHELL_COMMAND",
      "command": "input keyevent 26"
    },
    {
      "description": "Wait for 10 seconds",
      "eventType": "WAIT",
      "delayTime": 10000
    },
    {
      "description": "Screen on",
      "eventType": "ADB_SHELL_COMMAND",
      "command": "input keyevent 82"
    },
    {
      "description": "Wait for 10 seconds",
      "eventType": "WAIT",
      "delayTime": 10000
    }
}
Ignoring actions
A Robo script can contain instructions for Robo to ignore specific UI widgets or all UI widgets on a particular screen. These instructions are represented as ignoring "actions" with eventType ELEMENT_IGNORED and ALL_ELEMENTS_IGNORED correspondingly.

Whenever the contextDescriptor attribute of a Robo script containing ignoring actions matches a given screen, Robo does not interact with any UI widgets targeted by its ignoring actions (unless some other Robo script action makes Robo perform an action on one of the ignored UI widgets).

A Robo script can contain a mix of ignoring, conditional, and non-conditional actions. Unlike other Robo script actions, ignoring actions are applied as long as their containing Robo script's contextDescriptor matches a screen during a Robo crawl, regardless of the values of the priority and maxNumberOfRuns attributes.

The following is an example of a file with two Robo scripts. The first Robo script makes Robo ignore all UI widgets on a screen containing a UI widget with a resource ID "my.app.package:id/ignored_screen". The second Robo script makes Robo ignore UI widgets whose resource IDs match Java regex ".*:id/done" on a screen containing a UI widget with a resource ID "my.app.package:id/main_screen":


[
  {
    "id": 1000,
    "contextDescriptor": {
      "condition": "element_present",
      "elementDescriptors": [
        {
          "resourceId": "my.app.package:id/ignored_screen"
        }
      ]
    },
    "actions": [
      {
        "eventType": "ALL_ELEMENTS_IGNORED"
      }
    ]
  },
  {
    "id": 1001,
    "contextDescriptor": {
      "condition": "element_present",
      "elementDescriptors": [
        {
          "resourceId": "my.app.package:id/main_screen"
        }
      ]
    },
    "actions": [
      {
        "eventType": "ELEMENT_IGNORED",
        "elementDescriptors": [
          {
            "resourceIdRegex": ".*:id/done"
          }
        ]
      }
    ]
  }
]
RecyclerView and AdapterView support
Children of RecyclerView and AdapterView widgets are loaded dynamically and might be displayed many swipes away from the current screen. Since the size of a screen, and the number of swipes required to get to this child, is different for different device form factors, it is much more robust to rely on the child's data position, which is absolute. It is a less robust approach to rely on the number of swipes that are required to bring this child to the screen and then use its screen position.

Therefore, Robo script captures the absolute data positions of RecyclerView children that are targets of Robo script actions as recyclerViewChildPosition. Robo script also captures the absolute data positions of AdapterView children that are targets of Robo script actions as adapterViewChildPosition.

Actions on RecyclerView and AdapterView children are performed in the following steps:

Robo test ensures that the corresponding child is displayed on the screen through a positioning action on its containing RecyclerView or AdapterView.

Robo test performs the recorded action directly on the child element, since it is already displayed on the screen.

The following is an example of a click action on an AdapterView (android.widget.GridView) child:


{
  "eventType": "VIEW_CLICKED",
  "elementDescriptors": [
    {
      "className": "com.google.samples.apps.topeka.widget.AvatarView",
      "adapterViewChildPosition": 5,
      "resourceId": "com.google.samples.apps.topeka:id/avatar",
      "contentDescription": "Avatar 6"
    },
    {
      "className": "android.widget.GridView",
      "groupViewChildPosition": 1,
      "resourceId": "com.google.samples.apps.topeka:id/avatars"
    },
    {
      "className": "android.widget.LinearLayout",
      "groupViewChildPosition": 1
    },
    {
      "className": "android.widget.LinearLayout",
      "groupViewChildPosition": 0
    }
  ]
}
The following is an example of a click action on a RecyclerView (android.support.v7.widget.RecyclerView) child:


{
  "eventType": "VIEW_CLICKED",
  "elementDescriptors": [
    {
      "className": "android.support.v7.widget.AppCompatTextView",
      "groupViewChildPosition": 1,
      "resourceId": "com.google.samples.apps.topeka:id/category_title"
    },
    {
      "className": "android.widget.FrameLayout",
      "recyclerViewChildPosition": 8,
      "resourceId": "com.google.samples.apps.topeka:id/category_item"
    },
    {
      "className": "android.support.v7.widget.RecyclerView",
      "groupViewChildPosition": 1,
      "resourceId": "com.google.samples.apps.topeka:id/categories"
    },
    {
      "className": "android.widget.FrameLayout",
      "groupViewChildPosition": 1,
      "resourceId": "com.google.samples.apps.topeka:id/category_container"
    },
    {
      "className": "android.widget.LinearLayout",
      "groupViewChildPosition": 0
    }
  ]
}
Record a Robo script in Android Studio and run it in Test Lab
You can create a Robo script in Android Studio, which saves the script as a JSON file. You can then upload the JSON file to Firebase Test Lab with the application and run the test accordingly.

When you run a Robo test with a script attached, Robo test first steps through your pre-scripted actions and then explores the app as usual.

To create a Robo script JSON file in Android Studio, follow the steps in Record a Robo script using Test Lab in Android Studio.

Robo script actions
The following common optional attribute applies to all actions:

description - helps track execution of this Robo script action in Robo test outputs.
Assertion
If the asserted condition is true, the Robo script continues to the next action, which could be another assertion. Otherwise, the Robo script execution is halted due to a failed assertion.

The following table lists required attributes:

Attribute    Description
"eventType": "ASSERTION"    --
contextDescriptor    Describes the asserted context or condition. It has the same structure and offers similar capabilities as the Robo script's contextDescriptor.
The following is an example of a Robo script assertion that checks that the app-under-test is in the foreground:


{
  "eventType": "ASSERTION",
  "contextDescriptor": {
    "condition": "app_under_test_shown"
  }
}
The following is an example of a Robo script assertion that checks that a UI widget with the resource ID "com.google.samples.apps.topeka:id/done" is present on a screen:


{
  "eventType": "ASSERTION",
  "contextDescriptor": {
    "condition": "element_present",
    "elementDescriptors": [
      {
        "resourceId": "com.google.samples.apps.topeka:id/done"
      }
    ]
  }
}
The following is an example of a Robo script assertion that checks that "Settings" is NOT detected on a screen using OCR:


{
  "eventType": "ASSERTION",
  "contextDescriptor": {
    "condition": "element_present",
    "negateCondition": true,
    "visionText": "Settings"
  }
}
Click
The following table lists required attributes:

Attribute    Description
eventType    Specifies the type of the Robo script action.
"eventType": "VIEW_CLICKED"    Clicks the target element of the app-under-test.
"eventType": "SOFT_KEYBOARD_CLICK"    Clicks the target element of the soft keyboard.
"eventType": "SOFT_KEYBOARD_RANDOM_CLICK"    Clicks random elements of the soft keyboard up to maxNumberOfRuns times.
"eventType": "LIST_ITEM_CLICKED"    Used by the Robo script recorder in Android Studio for clicking list items.
elementDescriptors    Identifies the clicked UI widget using the Android UI hierarchy. Mutually exclusive with visionText.
visionText    Identifies the clicked element using OCR. Mutually exclusive with elementDescriptors.
matchIndex    Specifies the index of the occurrence of the matched target element, when the target element is identified using visionText. If it is 0, Robo script action picks the first matched element, if it is 1, Robo script action picks the second matched element, and so on. Ordering is determined left-to-right, top-to-bottom. The default value is 0 (the first match is picked).
maxNumberOfRuns    Specifies how many times to click a random element of the soft keyboard, when eventType is SOFT_KEYBOARD_RANDOM_CLICK. The default value is 1.
The following is an example of a Robo script action that clicks a button with the resource ID "com.google.samples.apps.topeka:id/done":


{
  "eventType": "VIEW_CLICKED",
  "elementDescriptors": [
    {
      "resourceId": "com.google.samples.apps.topeka:id/done"
    }
  ]
}
The following is an example of a Robo script action that clicks on the second occurrence of the "Search" word detected on a screen using OCR:


{
  "eventType": "VIEW_CLICKED",
  "visionText": "Search",
  "matchIndex": 1
}
The following is an example of a Robo script action that clicks a soft keyboard element with a content description "Emoji button":


{
  "eventType": "SOFT_KEYBOARD_CLICK",
  "elementDescriptors": [
    {
      "contentDescription": "Emoji button"
    }
  ]
}
The following is an example of a Robo script action that clicks random soft keyboard elements up to five times:


{
  "eventType": "SOFT_KEYBOARD_RANDOM_CLICK",
  "maxNumberOfRuns": 5
}
Disable soft keyboard
The following table lists required attributes:

Attribute    Description
"eventType": "DISABLE_KEYBOARD"    --
The following is an example of a Robo script action that disables the soft keyboard:


{
  "eventType": "DISABLE_KEYBOARD"
}
Execute adb shell command
The following table lists required attributes:

Attribute    Description
"eventType": "ADB_SHELL_COMMAND"    --
command    The Android Debug Bridge (adb) shell command to execute.
The following attribute is optional:

expectedOutputRegex - the expected output of the command as a Java regular expression. If the output does not match, the Robo script action fails. By default, it is an empty string, which means the output is not checked.
The following is an example of a Robo script action that clears the app-under-test user data:


{
  "eventType": "ADB_SHELL_COMMAND",
  "command": "pm clear __%APP_PACKAGE_NAME%__"
}
Grant permissions
This action is recorded by the Robo script recorder in Android Studio for backward compatibility with Espresso Test Recorder. Robo test grants all permissions to the app-under-test at the beginning of every crawl, and thus, this action is a no-op. Do NOT use this action in your Robo scripts.

The following table lists required attributes:

Attribute    Description
"eventType": "PERMISSIONS_REQUEST"    --
Ignore all elements on a screen
This action makes Robo ignore all elements on any screen that triggers the containing Robo script.

The following table lists required attributes:

Attribute    Description
"eventType": "ALL_ELEMENTS_IGNORED"    --
The following is an example of a Robo script action that makes Robo ignore all elements on a screen:


{
  "eventType": "ALL_ELEMENTS_IGNORED"
}
Ignore an element
This action makes Robo ignore an element (or elements) that match the specified elementDescriptors.

The following table lists required attributes:

Attribute    Description
"eventType": "ELEMENT_IGNORED"    --
elementDescriptors    Identifies the ignored UI widget(s) using the Android UI hierarchy.
The following attribute is optional:

ignoreChildren - if set to true, Robo also ignores all descendants of the ignored UI widget(s). By default, it is false.
The following is an example of a Robo script action that makes Robo ignore all elements, whose content descriptions start with "Avatar":


{
  "eventType": "ELEMENT_IGNORED",
  "elementDescriptors": [
    {
      "contentDescriptionRegex": "Avatar.*"
    }
  ]
}
Input text
The following table lists required attributes:

Attribute    Description
eventType    Specifies the type of the Robo script action.
"eventType": "VIEW_TEXT_CHANGED"    Inputs the given text into the target UI widget.
"eventType": "ENTER_TEXT"    inputs the given text into the target UI widget and then sends a KEYCODE_ENTER event to this UI widget.
elementDescriptors    Identifies the target UI widget using the Android UI hierarchy.
replacementText    The text to input into the target UI widget.
The following is an example of a Robo script action that inputs "John" into a UI widget with the resource ID "com.google.samples.apps.topeka:id/first_name":


{
  "eventType": "VIEW_TEXT_CHANGED",
  "replacementText": "John",
  "elementDescriptors": [
    {
      "resourceId": "com.google.samples.apps.topeka:id/first_name"
    }
  ]
}
Long click
The following table lists required attributes:

Attribute    Description
"eventType": "VIEW_LONG_CLICKED"    --
elementDescriptors    Identifies the target UI widget using the Android UI hierarchy. Mutually exclusive with visionText.
visionText    Identifies the long clicked element using OCR. Mutually exclusive with elementDescriptors.
matchIndex    Specifies the index of the occurrence of the matched target element, when the target element is identified using visionText. If it is 0, Robo script action picks the first matched element, if it is 1, Robo script action picks the second matched element, and so on. Ordering is determined left-to-right, top-to-bottom. The default value is 0 (the first match is picked).
The following attribute is optional:

delayTime - specifies how long the press down of a long click lasts, in milliseconds.
The following is an example of a Robo script action that performs a five seconds-long click on a UI widget with content description "Avatar 8":


{
  "eventType": "VIEW_LONG_CLICKED",
  "elementDescriptors": [
    {
      "contentDescription": "Avatar 8"
    }
  ],
  "delayTime": 5000
}
Perform a one-point gesture
The following table lists required attributes:

Attribute    Description
"eventType": "ONE_POINT_GESTURE"    --
coordinates    Two coordinates for a one-point gesture, formatted as "(x1,y1)->(x2,y2)" as percentages or pixels.
The following attribute is optional:

dragAndDrop - if set to true, the one-point gesture performs a drag-and-drop action. By default, it is false.
The following is an example of a Robo script one-point gesture action that performs a swipe down:


{
  "eventType": "ONE_POINT_GESTURE",
  "coordinates": "(50%,25%)->(50%,75%)"
}
Perform a two-point gesture
The following table lists required attributes:

Attribute    Description
"eventType": "TWO_POINT_GESTURE"    --
coordinates    Four coordinates for a two-point gesture, formatted as "(x1,y1)->(x2,y2),(x3,y3)->(x4,y4)" as percentages or pixels.
The following is an example of a Robo script action that performs a pinch out gesture:


{
  "eventType": "TWO_POINT_GESTURE",
  "coordinates": "(50%,50%)->(25%,50%),(50%,50%)->(75%,50%)"
}
Perform an IME action
This action presses the current action button, for example, next, done, and search, on the Input Method Editor (IME) for the specified target UI widget.

The following table lists required attributes:

Attribute    Description
"eventType": "PRESSED_EDITOR_ACTION"    --
elementDescriptors    Identifies the target UI widget using the Android UI hierarchy.
The following is an example of a Robo script action that performs an IME action on a UI widget with the resource ID "com.google.samples.apps.topeka:id/first_name":


{
  "eventType": "PRESSED_EDITOR_ACTION",
  "elementDescriptors": [
    {
      "resourceId": "com.google.samples.apps.topeka:id/first_name"
    }
  ]
}
Press back
The following table lists required attributes:

Attribute    Description
eventType    Specifies the type of the Robo script action.
"eventType": "PRESSED_BACK"    Sends a KEYCODE_BACK event to the device.
"eventType": "PRESSED_BACK_EMULATOR_28"    Used by the Robo script recorder in Android Studio for pressing back on emulators API 28.
The following is an example of a Robo script action that presses back:


{
  "eventType": "PRESSED_BACK"
}
Press home
This action sends a KEYCODE_HOME event to the device.

The following table lists required attributes:

Attribute    Description
"eventType": "GO_HOME"    --
The following is an example of a Robo script action that presses home:


{
  "eventType": "GO_HOME"
}
Scroll an element into view
This action makes Robo test scroll forward the UI widget that matches the specified elementDescriptors until the UI widget that matches the specified childElementDescriptors is present on the screen, or the scrolled widget can no longer be scrolled, or the max number of 50 scrolls is reached.

The following table lists required attributes:

Attribute    Description
"eventType": "ELEMENT_SCROLL_INTO_VIEW"    --
elementDescriptors    Identifies the scrolled UI widget using the Android UI hierarchy.
childElementDescriptors    Identifies the UI widget to scroll to using the Android UI hierarchy.
The following is an example of a Robo script action that scrolls the UI widget with the resource ID "my.app.package:id/scrollable_card_container" until the UI widget with text "Orange" is present on the screen (or no more scrolls can be performed, or the max number of 50 scrolls is reached):


{
  "eventType": "ELEMENT_SCROLL_INTO_VIEW",
  "elementDescriptors": [
    {
      "resourceId": "my.app.package:id/scrollable_card_container"
    }
  ],
  "childElementDescriptors": [
    {
      "text": "Orange"
    }
  ]
}
Swipe
The following table lists required attributes:

Attribute    Description
"eventType": "VIEW_SWIPED"    --
swipeDirection    Specifies the direction of the swipe:
Left
Right
Up
Down
Forward - either Down or Right depending on vertical or horizontal scrollability of the target UI widget.
Backward - either Up or Left depending on vertical or horizontal scrollability of the target UI widget.
elementDescriptors    Identifies the target UI widget using the Android UI hierarchy.
The following is an example of a Robo script action that swipes up a UI widget with the resource ID "my.app.package:id/custom_content":


{
  "eventType": "VIEW_SWIPED",
  "swipeDirection": "Up",
  "elementDescriptors": [
    {
      "resourceId": "my.app.package:id/custom_content"
    }
  ]
}
Take screenshot
The following table lists required attributes:

Attribute    Description
"eventType": "TAKE_SCREENSHOT"    --
screenshotName    Specifies the screenshot file name.
The following is an example of a Robo script action that takes a screenshot:


{
  "eventType": "TAKE_SCREENSHOT",
  "screenshotName": "my_screenshot"
}
Tap a point on the screen
The following table lists required attributes:

Attribute    Description
"eventType": "POINT_TAP"    --
pointTapXCoordinate    The pixel X coordinate of the tapped point. Mutually exclusive with pointTapXPercent and pointTapYPercent.
pointTapYCoordinate    The pixel Y coordinate of the tapped point. Mutually exclusive with pointTapXPercent and pointTapYPercent.
pointTapXPercent    The percentage X coordinate of the tapped point. Mutually exclusive with pointTapXCoordinate and pointTapYCoordinate.
pointTapYPercent    The percentage Y coordinate of the tapped point. Mutually exclusive with pointTapXCoordinate and pointTapYCoordinate.
The following is an example of a Robo script action that taps in the middle of a screen:


{
  "eventType": "POINT_TAP",
  "pointTapXPercent": 50,
  "pointTapYPercent": 50
}
Tap a point within an element
The following table lists required attributes:

Attribute    Description
"eventType": "POINT_TAP_ELEMENT"    --
pointTapXPercent    The percentage X coordinate within the target element.
pointTapYPercent    The percentage Y coordinate within the target element.
elementDescriptors    Identifies the target UI widget using Android UI hierarchy.
The following is an example of a Robo script action that moves a seekbar’s slider to the right:


{
  "eventType": "POINT_TAP_ELEMENT",
  "pointTapXPercent": 80,
  "pointTapYPercent": 50,
  "elementDescriptors": [
    {
      "resourceId": "my.app.package:id/my_seekbar"
    }
  ]
}
Terminate crawl
This action stops the Robo test.

The following table lists required attributes:

Attribute    Description
"eventType": "TERMINATE_CRAWL"    --
The following is an example of a Robo script action that stops a Robo test:


{
  "eventType": "TERMINATE_CRAWL"
}
Wait
The following table lists required attributes:

Attribute    Description
"eventType": "WAIT" (or "DELAYED_MESSAGE_POSTED")    --
delayTime    Specifies how long to wait, in milliseconds.
The following is an example of a Robo script action that waits for three seconds:


{
  "eventType": "WAIT",
  "delayTime": 3000
}
Wait for an element
This action makes Robo test wait for an element to appear on the screen up to the specified timeout.

The following table lists required attributes:

Attribute    Description
"eventType": "WAIT_FOR_ELEMENT"    --
delayTime    Specifies the waiting timeout, in milliseconds.
elementDescriptors    Identifies the waited-for UI widget using the Android UI hierarchy.
The following is an example of a Robo script action that waits for up to 30 seconds for a UI widget with the resource ID "my.app.package:id/confirmation_button" to appear on the screen:


{
  "eventType": "WAIT_FOR_ELEMENT",
  "delayTime": 30000,
  "elementDescriptors": [
    {
      "resourceId": "my.app.package:id/confirmation_button"
    }
  ]
}
