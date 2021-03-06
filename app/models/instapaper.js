var Instapaper = Class.create({
  login: function(credentials, success, failure, offline) {
    Instapaper.credentials = credentials;

    var req = new Ajax.Request("http://www.instapaper.com/user/login", {
      method: "post",
      timeout: 5000,
      parameters: {username: credentials.username, password: credentials.password},
      onFailure: offline,
      onSuccess: this.loginComplete.bind(this, success, failure)
    });
  },

  loginComplete: function(success, failure, response) {
    if(response.responseText.match(/form.*action="\/user\/login/)) {
      failure();
    }
    else {
      success();
    }
  },

  add: function(url, title, success, failure) {
    var parameters = {
      username: Instapaper.credentials.username,
      password: Instapaper.credentials.password,
      url: url
    };

    if(title && title.strip().length) {
      parameters.title = title;
    }
    else {
      parameters['auto-title'] = 1;
    }

    var req = new Ajax.Request("http://www.instapaper.com/api/add", {
      method: "post",
      parameters: parameters,
      onSuccess: success,
      onFailur: failure
    });
  },

  getAllUnread: function(success, failure) {
    var req = new Ajax.Request("http://www.instapaper.com/u", {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    });
  },

  getArchived: function(success, failure) {
    var req = new Ajax.Request("http://www.instapaper.com/archive", {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    });
  },

  getStarred: function(success, failure) {
    var req = new Ajax.Request("http://www.instapaper.com/starred", {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    });
  },

  getFolder: function(url, success, failure) {
    var req = new Ajax.Request(url, {
      method: "get",
      onSuccess: this.parseItems.bind(this, success),
      onFailure: failure
    });
  },

  absoluteUrl: function(a) {
    return a ? a.href.replace(/file:\/\//, 'http://www.instapaper.com') : null;
  },

  parseItems: function(success, response) {
    var folders = [];
    var items = [];
    var div = document.createElement("div");
    div.innerHTML = response.responseText.replace(/<img.*>/g, '');

    $(div).select("#bookmark_list .tableViewCell").each(function(rawItem) {
      var item = {};

      var title = rawItem.down("a.tableViewCellTitleLink");

      if(title) {
        item.id = rawItem.id.match(/\d+/)[0];
        item.title = title ? title.innerHTML.unescapeHTML().replace(/&nbsp;/g, ' ') : "";
        item.url = title ? title.href : null;

        var host = rawItem.down("span.host");
        item.host = host ? host.innerHTML.strip() : "";

        var textUrl = rawItem.down("a.textButton");
        item.textUrl = "http://www.instapaper.com/m?u=" + escape(item.url);

        var deleteUrl = rawItem.down("a.deleteLink");
        item.deleteUrl = this.absoluteUrl(deleteUrl);

        var archiveUrl = rawItem.down("a.archiveButton");

        if(archiveUrl && archiveUrl.innerHTML == "Delete") {
          item.deleteUrl = this.absoluteUrl(archiveUrl);
        }
        else if(archiveUrl) {
          item.archiveUrl = this.absoluteUrl(archiveUrl);
        }

        var restoreUrl = rawItem.down("a.restoreButton");
        item.restoreUrl = this.absoluteUrl(restoreUrl);

        var starUrl = rawItem.down("a.starToggleStarred");
        item.starUrl = this.absoluteUrl(starUrl);

        if(starUrl) {
          item.starred = starUrl.style.display != 'none' ? 'on' : '';
        }

        rawItem.select(".moveTo").each(function(moveTo) {
          item.moveTo = item.moveTo || [];
          var name = moveTo.innerHTML.strip();

          if(name == "Read Later") {
            name = "Unread";
          }

          item.moveTo.push({url: this.absoluteUrl(moveTo), name: name});
        }.bind(this));

        items.push(item);
      }
    }.bind(this));

    $(div).select("#folders a").each(function(folder) {
      if(folder.href.include("/folder/")) {
        folders.push({name: folder.innerHTML.strip(), url: this.absoluteUrl(folder)});
      }
    }.bind(this));

    success(items, folders);
  }
});
