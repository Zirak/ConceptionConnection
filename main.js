var form = document.container,
	results = document.getElementById('results');

form.onsubmit = function (e) {
	e.preventDefault();

	this.submit.disabled = true;
	empty(results);

	conceptionConnection();
};

function conceptionConnection () {
	var bday = new Date(Date.parse(form.date.value)),
		cday = calcConceptionDate(bday, Number(form.premature.value));

	console.log(cday);
	announce('You were conceived at approx. ' + cday.toDateString());

	doRequest(cday.getFullYear(), function (res) {
		res = filterResults(res, cday);
		output(res);
	});
}

function calcConceptionDate (bday, prematureDays) {
	var ret = new Date(bday.getTime());
	ret.setDate(ret.getDate() - 280); //40(weeks) * 7(days/week) = 280(days)
	ret.setDate(ret.getDate() + prematureDays)

	return ret;
}

function filterResults (resp, date) {
	var html = getActualResult(resp);

	//give a leeway of a 8 days. why 8? I vaguely remember that's the accuarcy
	// of the 40 weeks thing.
	var min = new Date(date.getTime()),
		max = new Date(date.getTime());
	min.setDate(min.getDate() - 8);
	max.setDate(max.getDate() + 8);

	//now comes to tricky part: doing bastard parsing of the returned html
	//we cheat by creating a container for that page
	var root = document.createElement('body');
	root.innerHTML = html; //forgive me...

	//if they're on the same month, this eases things for us, since we don't
	// have to select events from 2 distinct months
	if (min.getMonth() === max.getMonth()) {
		return eventsOn(date, function (otherDay) {
			return otherDay >= min.getDate() &&
				otherDay <= max.getDate();
		});
	}

	return [].concat(
		eventsOn(min, function (otherDay) {
			return otherDay >= min.getDate();
		}),

		eventsOn(max, function (otherDay) {
			return otherDay <= max.getDate();
		})
	);

	function eventsOn (date, comparer) {
		var month = [
			'january', 'february', 'march', 'april',
			'may', 'june', 'july', 'august',
			'september', 'october', 'november', 'december'
		][date.getMonth()];
		console.log( 'month = ' + month)

		//now, filter out the headers
		//TODO: this results in multiple possible headers - events and deaths.
		// we only select the events. add support for deaths and births?
		var head =
			[].filter.call(root.getElementsByTagName('h3'), function (h) {
				var m = h.textContent.trim().toLowerCase();
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
			var day = Number(match[1]);
			return match && comparer(day);
		});
		console.log(children);

		//we need to flatten out the resulting elements, and we're done!
		return flatten(children);
	}

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
			data = data
				.replace(/^\w+\s+\d+\s+\u2013/, '')
				.trim();
			console.log(data);

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

	//this was a good year for a mishmash of wikipedia formats; using it for
	// testing
	if (year === 1994) {
		script.src = 'test-1994.js';
	}
	document.head.appendChild(script);
}

function output (res) {
	var events = document.createElement('ul'),
		text;

	if (res.length) {
		text = 'Most likely historical events that aroused your parents:';
	}
	else {
		text = 'Nothing historic aroused your parents';
	}
	announce(text);

	form.submit.disabled = false;
	res.forEach(outputLi);

	results.appendChild(events);

	function outputLi (ev) {
		var li = document.createElement('li');
		li.textContent = ev;
		events.appendChild(li);
	}
}

function announce (msg) {
	var cont = document.createElement('div');
	cont.textContent = msg;
	results.appendChild(cont);
}

function empty (el) {
	while (el.firstChild) {
		el.removeChild(el.firstChild);
	}
}
