function LittleBigTable(settings) {
    return {
        // settings for the developer to override
        settings: {
            url: null,
            key_prefix: 'lbt',
            limit: 10,
            multisort: false,
            messages: {
                loading: 'Loading...',
                failed: 'Loading failed',
                summary: 'rows'
            },
            formatters: {},
            icon: '../dist/icons.svg',
        },
        // stores the ui state
        meta: {
            loading: false,
            status: null,
        },
        // stores the parameters passed in query string
        params: {
            limit: 10,
            offset: 0,
            search: null,
            total: 0,
        },
        // stores the table rows
        rows: [],
        // stores the column(s) sorting state
        sort: {},
        // initial setup before interaction
        init: function() {
          // set preferences from localStorage
          this.params.limit = localStorage.getItem(this.settings.key_prefix + '.limit');
          if (this.params.limit < 10 || this.params.limit > 100) {
            this.params.limit = this.settings.limit;
          }
          // apply settings - should this use getters/setter methods to sanity check input?
          for (i in settings) {
            if (this.settings.hasOwnProperty(i)) {
              this.settings[i] = settings[i];
            }
          }
          // fetch data
          this.fetch();
        },
        // fetch and populate data using current state
        fetch: function() {
          if ( ! this.settings.url) {
            this.setStatus('Missing api url, pass it in the settings.');
            return;
          }
          this.meta.loading = true;
          this.setStatus(this.settings.messages.loading);
          fetch(this.settings.url + this.getUrlParams(), {
              headers: {}
          }).then(response => {
              return response.json()
          }).then(json => {
                this.rows = [];
                this.params.total = json.total;
                for (i in json.data){
                    this.addRow(json.data[i]);
                }
            }).then(() => {
                this.meta.loading = false;
                this.setStatus(this.getSummary(this.settings.messages.summary));
            }).catch(error => {
                console.error('Network fetch failed, did you set the endpoint correctly? Error: ', error);
                this.setStatus(this.settings.messages.failed);
            });
        },
        // adds the data row to the table
        addRow: function(data) {
            // todo check for field formatter by name
            let row = {};
            for (i in data) {
                if (typeof this.settings.formatters[i] == 'function') {
                    fn = this.settings.formatters[i];
                    row[i] = fn(data[i], data);
                } else {
                    row[i] = data[i];
                }
            }
            this.rows.push(row);
        },
        // returns the url params for the GET request
        getUrlParams: function() {
            let str = '?limit='+this.params.limit+'&offset='+this.params.offset;
            if (this.params.search) {
                str+= '&search='+this.params.search;
            }

            let sort = null;
            for (i in this.sort) {
                sort = i + ':' + this.sort[i];
            }
            if (sort) {
                str+= '&sort='+sort;
            }

            return str;
        },
        // returns the current page number
        getCurrentPage: function() {
            if (this.params.offset == 0) {
                return 1;
            }
            return parseInt(parseInt(this.params.offset) / parseInt(this.params.limit) + 1);
        },
        // returns the total number of pages in the data set (on the server, requires total to be passed in result)
        getTotalPages: function() {
            return parseInt(Math.ceil(parseInt(this.params.total) / parseInt(this.params.limit)));
        },
        // returns the total number of rows of data on the server
        getTotalRows: function() {
            return parseInt(this.params.total);
        },
        // returns the offset of the first row
        getFirstPageOffset: function() {
            return 0;
        },
        // returns the offset of the first row on the previous page
        getPrevPageOffset: function() {
            let int = parseInt(parseInt(this.getCurrentPage() - 2) * parseInt(this.params.limit));
            return (int < 0)  ? 0 : int;
        },
        // returns the offset of the first row on the next page
        getNextPageOffset: function() {
            let int = parseInt(parseInt(this.getCurrentPage()) * parseInt(this.params.limit));
            return int;
        },
        // returns the offset of the first row on the last page
        getLastPageOffset: function() {
            let int = parseInt(parseInt(this.getTotalPages() - 1) * parseInt(this.params.limit));
            return (int < 0)  ? 0 : int;
        },
        // returns the offset for a particular page, (this may be slightly off depending on the limit chosen)
        getOffsetForPage: function() {
            // determine correct offset boundary for the current page
            // loop through pages, if (offset between prev and next) recalculate
            for (i=0; i<parseInt(this.params.total); i+=parseInt(this.params.limit)) {
                if (i >= this.getPrevPageOffset() && i <= this.getNextPageOffset()) {
                    return parseInt(i) + parseInt(this.params.limit);
                }
            }
            return this.getLastPageOffset();
        },
        // returns the index of first row on the page
        getFirstDisplayedRow: function() {
            return this.params.offset + 1;
        },
        // returns the index of last row on the page
        getLastDisplayedRow: function() {
            let int = parseInt(this.params.offset) + parseInt(this.params.limit);
            if (int > this.params.total) {
                int = this.params.total;
            }
            return int;
        },
        // returns a status summary, either number of rows or number of pages
        getSummary: function(type='rows', name='results') {
            if ( ! this.rows.length) {
                return 'No results';
            }
            if (type.toLowerCase() == 'pages') {
                return 'Showing page <strong>' + this.getCurrentPage() + '</strong> of <strong>' + this.getTotalPages() + '</strong>';
            }
            return 'Showing <strong>' + this.getFirstDisplayedRow() + '</strong> to <strong>' + this.getLastDisplayedRow() + '</strong> of <strong>' + this.getTotalRows() + '</strong> ' + name;
        },
        // returns the required icon for the sort state
        getSortIcon: function(col) {
            let icon = 'none';
            if (undefined !== this.sort[col]) {
                icon = this.sort[col];
            }
            return '<svg class="icon"><use xlink:href="' + this.settings.icon + '#sort-' + icon + '"></use></svg>';
        },
        // set the number of rows to show per page and saves preference in localStorage
        // tries to keep the current rows on the page
        setLimit: function() {
            // sanity check input
            if (this.params.limit < 10 || this.params.limit > 100) {
                this.params.limit = 25;
            }
            // reset offset and fetch
            // determine current position, if greater than last page, go to last page
            // get currentpageoffset
            this.params.offset = this.getOffsetForPage();
            // store preference
            localStorage.setItem(this.settings.key_prefix + '.limit', this.params.limit);
            this.fetch();
        },
        // sets the statusbar text
        setStatus: function(str) {
            this.meta.status = str;
        },
        // toggle the sort state between 'null', 'asc' and 'dsc'
        toggleSortColumn: function(col) {
            if (undefined == this.sort[col]) {
                this.sort[col] = 'asc';
            } else if (this.sort[col] == 'asc') {
                this.sort[col] = 'dsc';
            } else if (this.sort[col] == 'dsc') {
                delete this.sort[col];
            }
        },
        // sets the offset to the first page and fetches the data
        goFirstPage: function() {
            this.params.offset = this.getFirstPageOffset();
            this.fetch();
        },
        // sets the offset to the top of the last page and fetches the data
        goLastPage: function() {
            this.params.offset = this.getLastPageOffset();
            this.fetch();
        },
        // sets the offset to the top of the next page and fetches the data
        goNextPage: function() {
            this.params.offset = this.getNextPageOffset();
            this.fetch();
        },
        // sets the offset to the top of the previous page and fetches the data
        goPrevPage: function() {
            this.params.offset = this.getPrevPageOffset();
            this.fetch();
        },
        // todo jump to a particular page by number
        goToPage: function() {
        },
        // handle the user search input, always returning to the start of the results 
        doSearch: function() {
            this.params.offset = 0;
            this.fetch();
        },
        // handle the column sort
        doSort: function(col) {
            if (false == this.settings.multisort) {
                let state = this.sort[col];
                this.sort = {};
                this.sort[col] = state;
            }
            this.toggleSortColumn(col);
            this.fetch();
        },
        debug: function() {
            return JSON.stringify(this.params) + JSON.stringify(this.meta) + JSON.stringify(this.sort);
        }
    }
}
