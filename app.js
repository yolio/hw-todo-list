const express = require('express');
const app = module.exports = express();
const port = 3000;
//const address = 'mongodb://localhost/todo_db';
const address ='mongodb://guest:2do2do@ds119795.mlab.com:19795/db_yolio';

const mongoose = require('mongoose');
mongoose.connect(address, { useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', () => console.log('connection to database open'));

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// const assert = require('assert');

const Todo = require('./todo');

function handleError(err, next) {
    return console.error(err);
}

app.use((req, res, next) => {
    req.requestTime = Date.now();
    console.log(`${ req.method } request at ${ req.requestTime }`);

    next();
});

app.use((req, res, next) => {
    if (!req.headers.authorization) {
	console.log('no auth header');

	const err = new Error();
	err.status = 401;
	err.message = 'unauthorized';

	next(err);
    }
    else if (req.headers.authorization === 'Bearer validToken') {
	console.log('auth passed');

	next();
    }
    else {
	console.log('auth failed');

	const err = new Error();
	err.status = 403;
	err.message = 'access denied';

	next(err);
    }
});

function validateTodo(req, res, next) { 
    const joi = require('joi');
    const joiTodoSchema = joi.object().keys({
	todo: [
	    joi.string().min(2).max(42).regex(/^[A-Za-z]+.+[\S]$/), // arbitrary criteria
	    joi.string().regex(/[a-z\d]{24}/) // mongodb's _id format
	]
    });

    joi.validate(req.params, joiTodoSchema, (err, input) => {
	if (!err) {
	    console.log('input passed joi validation');

	    next();
	}
	else {
	    console.log('input failed joi validation');
	    
	    const err = new Error();
	    err.status = 400;
	    err.message = 'request must specify task or id';

	    next(err);
	}
    });
}

app.use('/todos/:todo', validateTodo, (req, res, next) => {
    next();
});

app.use((err, req, res, next) => {
    res.status(err.status).send(err.message);
});

app.get('/', (req, res) => {
    res.status(200).send('hey there');
});

app.post('/todos/add', (req, res, next) => {
    const todo = new Todo();
    todo.task = req.body.todo;
    // todo.addedOn = Date.now();
    // todo.completed = false;

    todo.save().then(() => {
	console.log(req.body.todo);
	res.status(200).send(`added todo '${ req.body.todo }'`);
    }).catch(err => {
	if (err.name === 'MongoError' && err.errmsg.match(new RegExp(/^E11000/))) {
	    console.log('duplicate name - ignore');
	    console.log(req.body.todo);
	    res.status(409).send(`already have this todo`);
	}
	else return handleError(err);
    });
});

app.delete('/todos/:todo/delete', (req, res, next) => {
    const handleTodo = (todo, res) => {
	if (!todo) {
	    console.log('nothing to delete');
	    res.status(400).send('todo was not here to begin with');
	}
	console.log(`'${ req.params.todo }' is no more`);
	res.status(200).send(`deleted todo '${ req.params.todo }'`);
    };
    
    Todo.findByIdAndDelete(req.params.todo).then((todo) => {
	handleTodo(todo, res);
    }).catch(err => {
	if (err.name === 'CastError') {
	    Todo.findOneAndDelete({ task: req.params.todo }).then((todo) => {
		handleTodo(todo, res);
	    }).catch(err => handleError(err));
	}
	else handleError(err);
    });
});

// for testing purposes only
app.get('/todos/:todo/get_id', (req, res, next) => {
    Todo.findOne({ task: req.params.todo }).catch(err => handleError()).then((todo) => {
	res.status(200).send(todo._id);
    });
});

app.get('/todos/list', (req, res, next) => {
    const todos = Todo.find();

    todos.exec((err, todos) => {
	if (err) return handleError(err);

	if (!todos.length) {
	    console.log('nothing to list');
	    res.status(404).send('there is nothing here');
	}

	// const list = todos.map((todo) => `${ todo.task } ${ todo.completed ? 'DONE' : 'TODO' }`);

	// res.status(200).send(list);
	res.status(200).json(todos);
    });
});

app.put('/todos/:todo/check', (req, res, next) => {
    const handleTodo = (todo, res) => {
	if (!todo) {
	    console.log('you did not have to do this');
	    res.status(400).send('you have to add todo before you check it');
	}
	const alert = `${ todo.task } ${ todo.completed ? 'DONE' : 'TODO' }`;

	console.log(alert);
	res.status(200).send(alert);
    };
    
    Todo.findByIdAndUpdate(req.params.todo, {
	$set: { completed: true }
    }, { new: true }).then((todo) => {
	handleTodo(todo, res);
    }).catch(err => {
	if (err.name === 'CastError') {
	    Todo.findOneAndUpdate({ task: req.params.todo }, {
		$set: { completed: true }
	    }, { new: true }).then((todo) => {
		handleTodo(todo, res);
	    }).catch(err => handleError(err));
	}
	else handleError(err);
    });
});

app.put('/todos/:todo/uncheck', (req, res, next) => {
    const handleTodo = (todo, res) => {
	if (!todo) {
	    console.log('you never added this');
	    res.status(400).send('you have to add todo before you uncheck it');
	}
	const alert = `${ todo.task } ${ todo.completed ? 'DONE' : 'TODO' }`;

	console.log(alert);
	res.status(200).send(alert);
    };
    
    Todo.findByIdAndUpdate(req.params.todo, {
	$set: { completed: false }
    }, { new: true }).then((todo) => {
	handleTodo(todo, res);
    }).catch(err => {
	if (err.name === 'CastError') {
	    Todo.findOneAndUpdate({ task: req.params.todo }, {
		$set: { completed: false }
	    }, { new: true }).then((todo) => {
		handleTodo(todo, res);
	    }).catch(err => handleError(err));
	}
	else handleError(err);
    });
});

if (require.main === module) {
    app.listen(port, () => {
	console.log(`started listening to ${ port } at ${ Date.now() }`);
    });
}
