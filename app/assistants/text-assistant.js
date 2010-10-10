var TextAssistant = Class.create(BaseAssistant, {
  initialize: function($super, item) {
    $super()
    this.item = item
    this.firstStopAttempt = false
    this.spinner = {spinning: true}
  },

  setup: function($super) {
    $super()

    this.controller.update("title", this.item.title)
    this.controller.stageController.setWindowOrientation("free")

    if(this.item.archiveUrl) {
      this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [{label: "Archive", command: "archive"}]});
    }
    else if(this.item.restoreUrl) {
      this.controller.setupWidget(Mojo.Menu.commandMenu, {}, {items: [{label: "Restore", command: "restore"}]});
    }

    this.controller.listen("header", Mojo.Event.tap, this.headerTapped = this.headerTapped.bind(this))
    this.controller.listen("header", Mojo.Event.hold, this.linkOptions = this.linkOptions.bind(this))
    this.controller.listen(document, "keydown", this.keyDown = this.keyDown.bind(this))
    this.controller.listen(document, "keyup", this.keyUp = this.keyUp.bind(this))
  },

  cleanup: function($super) {
    $super()
    this.controller.stageController.setWindowOrientation("up")
    this.controller.stopListening("header", Mojo.Event.tap, this.headerTapped)
    this.controller.stopListening("header", Mojo.Event.hold, this.linkOptions)
    this.controller.stopListening(document, "keydown", this.keyDown)
    this.controller.stopListening(document, "keyup", this.keyUp)
  },

  activate: function($super) {
    $super()

    ArticleSaver.isSaved(this.item.id,
      function() {
        var url = "file:///media/internal/files/.sparetime/.cache/" + this.item.id + "/index.html"
        this.loadUrl(url)
      }.bind(this),

      function() {
        this.loadUrl(this.item.textUrl)
      }.bind(this)
    )
  },

  loadUrl: function(url) {
    this.spinnerOn("retrieving article")

    new Ajax.Request(url, {
      method: "GET",

      onSuccess: function(response) {
        this.controller.update('content', response.responseText)
      }.bind(this),

      onFailure: function() {
        console.log("AHHHH CRAP")
      },

      onComplete: function() {
        this.spinnerOff()
      }.bind(this)
    })
  },

  linkOptions: function(event) {
    this.headerHeld = true

    var items = [
      {label: "Copy It", command: "copy-url"},

      {label: "Tweet It", items: [
        {label: "Bad Kitty", command: "send-to-bad-kitty"}
      ]},

      {label: "Share It", items: [
        {label: "Email", command: "send-to-email"},
        {label: "SMS", command: "send-to-sms"}
      ]}
    ]

    if(this.item.moveTo) {
      var moveSelections = {label: "Move It", items: []}

      this.item.moveTo.each(function(moveTo) {
        moveSelections.items.push({label: moveTo.name, command: moveTo.url})
      })

      items.push(moveSelections)
    }

    this.controller.popupSubmenu({
      placeNear: $("header"),
      items: items,

      onChoose: function(command) {
        switch(command) {
          case "copy-url":
            this.copyUrl()
            break

          case "send-to-bad-kitty":
            this.sendToBadKitty()
            break

          case "send-to-email":
            this.sendToEmail()
            break

          case "send-to-sms":
            this.sendToSms()
            break

          default:
            this.moveToFolder(command)
            break
        }
      }.bind(this)
    })
  },

  moveToFolder: function(url) {
    if(url.startsWith("http://")){
      this.callAndReturn(url)
    }
  },

  copyUrl: function() {
    this.controller.stageController.setClipboard(this.item.url);
    SpareTime.notify("URL copied to clipboard")
  },

  sendToBadKitty: function() {
    this.controller.serviceRequest("palm://com.palm.applicationManager", {
      method: "open",

      parameters: {
        id: "com.superinhuman.badkitty",
        params: {action: "tweet", tweet: this.item.title + "\n\n" + this.item.url}
      },

      onFailure: this.offerToInstallApp.bind(this, "Bad Kitty", "com.superinhuman.badkitty")
    })
  },

  sendToEmail: function() {
    this.controller.serviceRequest("palm://com.palm.applicationManager", {
      method: "open",

      parameters: {
  			id: "com.palm.app.email",
        params: {summary: this.item.title, text: this.item.title + "\n\n" + this.item.url}
      }
    })
  },

  sendToSms: function() {
    this.controller.serviceRequest("palm://com.palm.applicationManager", {
      method: "open",

      parameters: {
  			id: "com.palm.app.messaging",
        params: {messageText: this.item.title + "\n\n" + this.item.url}
      }
    })
  },

  offerToInstallApp: function(name, id) {
    this.controller.showAlertDialog({
      title: $L(name + " is not installed"),
      message: $L(name + " is not installed. Would you like to install it?"),

      choices:[
        {label:$L("Yes"), value:"yes", type:"affirmative"},
        {label:$L("No"), value:"no", type:"dismissal"}
      ],

      onChoose: function(value){
        if("yes" == value){
          this.controller.serviceRequest("palm://com.palm.applicationManager", {
            method:"open",
            parameters:{target: "http://developer.palm.com/appredirect/?packageid=" + id}
          })
        }
      }
    })
  },

  keyDown: function(event) {
    if("Meta" == event.keyIdentifier) {
      this.metaKey = true
    }
  },

  keyUp: function(event) {
    if("Meta" == event.keyIdentifier) {
      this.metaKey = false
    }
  },

  headerTapped: function(event) {
    if(this.headerHeld) {
      this.headerHeld = false
    }
    else if(this.metaKey) {
      this.linkOptions()
    }
    else if(this.item.url) {
      this.controller.serviceRequest("palm://com.palm.applicationManager", {
        method: "open",
        parameters: {
          id: "com.palm.app.browser",
          params: {
            target: this.item.url
          }
        }
      })
    }
  },

  handleCommand: function($super, event) {
    if(event.command == 'archive') {
      this.archive(this.item)
    }
    else if(event.command == 'restore') {
      this.restore(this.item)
    }
    else {
      $super(event)
    }
  },

  archive: function(item) {
    this.callAndReturn(item.archiveUrl)
  },

  restore: function(item) {
    this.callAndReturn(item.restoreUrl)
  },

  callAndReturn: function(url) {
    new Ajax.Request(url, {method: "get"})
    this.controller.stageController.popScene(this.item)
  }
})