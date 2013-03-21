var form = document.container,
	results = document.getElementById('results');

form.onsubmit = function (e) {
	console.log('foo');
	e.preventDefault();

	this.submit.disabled = true;
	empty(results);

	conceptionConnection();
};

function conceptionConnection () {
	var date = new Date(Date.parse(form.date.value));
	date.setDate(date.getDate() - Number(form.premature.value));
	date.setMonth(date.getMonth() - 9);
	console.log(date);

	doRequest(date.getFullYear(), function (res) {
		res = filterResults(res, date);
		output(res);
	});
}

function filterResults (resp, date) {
	var html = getActualResult(resp);

	var months = [
		'january', 'february', 'march', 'april',
		'may', 'june', 'july', 'august',
		'september', 'october', 'november', 'december'
	];

	//TODO: for the initial experimentation, I used just 1 date. we need to add
	// handling for the maximum date as well.
	var month = months[date.getMonth()];
	console.log('month = ' + month);

	//now comes to tricky part: doing bastard parsing of the returned html
	//we cheat by creating a container for that page
	var root = document.createElement('body');
	root.innerHTML = html; //forgive me...

	//now, filter out the headers
	//TODO: this results in multiple possible headers - events and deaths. we
	// only select the events. add support for deaths and births?
	var head = [].filter.call(root.getElementsByTagName('h3'), function (h) {
		var m = h.textContent.trim().toLowerCase();
		console.log(m);
		return m === month;
	})[0];
	console.log(head);

	if (!head) {
		return [];
	}

	var list = head.nextElementSibling;
	//the head contains an immediate ul child, each li looking like one of:
	// October 4 – Mad rabbit destroyed Switzerland
	// <ul> <li>...</li><li>...</li> </ul>
	//depending on whether there's only one event or many
	var children = [].filter.call(list.children, function (li) {
		var child = li.firstChild,
			match = /\s(\d+)/.exec(child.data);

		if (!match) {
			return false;
		}
		var day = Number(match[1]),
			comp = date.getDate();

		return match && day === comp || (day < comp+7 && day > comp-7);
	});
	console.log(children);

	//we need to flatten out the resulting elements, and we're done!
	return flatten(children);

	function flatten (lis) {
		return [].reduce.call(lis, extract, []);
	}
	function extract (ret, li) {
		console.log(li);
		if (li.children.length) {
			ret.push.apply(ret, flatten(li.getElementsByTagName('li')));
		}
		else {
			var data = li.firstChild.data;
			//October 4 – ...
			data = data.replace(/^\w+\s+\d+\s+–/, '').trim();

			ret.push(data);
		}
		return ret;
	}
	//PHEW
}

function getActualResult (resp) {
	var query = resp.query,
		pageid = query.pageids[0];
	return query.pages[pageid].extract;
}

function doRequest (year, cb) {
	//see the wikipedia API page: https://www.mediawiki.org/wiki/API
	var url = 'http://en.wikipedia.org/w/api.php?format=json&callback=API_REQUEST_DONE&action=query&prop=extracts&indexpageids&titles=' + encodeURIComponent(year);

	var script = document.createElement('script');
	script.src = url;

	window.API_REQUEST_DONE = function (resp) {
		//cleanup on aisle 4
		delete window.API_REQUEST_DONE;
		script.parentNode.removeChild(script);

		cb(resp);
	};

	document.head.appendChild(script);
}

function output (res) {
	res.forEach(outputLi);
	form.submit.disabled = false;

	function outputLi (ev) {
		var li = document.createElement('li');
		li.textContent = ev;
		results.appendChild(li);
	}
}

function empty (el) {
	while (el.firstChild) {
		el.removeChild(el.firstChild);
	}
}
