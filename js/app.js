(function (window) {

  var Promise = Ember.RSVP.Promise;

  ////////////////////////////////////////////////////////////
  // Utility
  ////////////////////////////////////////////////////////////

  var Utility = Ember.Object.extend({

    /**
     * Return a user from the store. If the user doesn't exist, create a new user
     *
     * @param {String} username
     * @return {Promise}
     */

    getUserByUsername: function(username) {
      var store = this.get('store');
      username = username.replace(/[^a-zA-Z0-9 -]/g, '');
      return this.get('store').find('user', username).then(function(user) {
        return user;
      }, function() {
        // HACK: `find()` creates an entry in store.typeMapFor().idToRecord which prevents `createRecord()` from working
        delete store.typeMapFor(store.modelFor('user')).idToRecord[username];
        // A user couldn't be found, so create a new user
        var user = store.createRecord('user', {
          id: username,
          created: new Date().getTime()
        });
        // Save the user
        user.save();
        return user;
      });
    },
    orderId: 'empty',
    getOrder: function() {
      var store = this.get('store');
      var id = this.get('orderId');
      var self = this;
      return this.get('store').find('order', id).then(function(order) {
        return order;
      }, function() {
        // HACK: `find()` creates an empty record which prevents `createRecord()` from working
        delete store.typeMapFor(App.Order).idToRecord[id];
        // A user couldn't be found, so create a new user
        var order = store.createRecord('order', {
          //id: username,
          isShipped: 0,
          createdAt: new Date().getTime()
        });
        // Save the user
        order.save();
        self.set('orderId', order.get('id'));
        return order;
      });
    },
    getProductById: function(id) {
      var store = this.get('store');
      return this.get('store').find('product', id).then(function(product) {
        return user;
      }, function() {
        // HACK: `find()` creates an empty record which prevents `createRecord()` from working
        delete store.typeMapFor(App.Product).idToRecord[id];
        // A user couldn't be found, so create a new user
        alert("no product found");
      });
    }
  });

  ////////////////////////////////////////////////////////////
  // App
  ////////////////////////////////////////////////////////////

  var App = Ember.Application.create({
    ready: function () {
      // Util
      this.register('utility:main', Utility, { singleton: true, instantiate: true });
      ['controller', 'route', 'component', 'adapter', 'transform', 'model', 'serializer'].forEach(function(type) {
        this.inject(type, 'util', 'utility:main');
      }, this);
      // Store
      ['component', 'utility:main'].forEach(function(type) {
        this.inject(type, 'store', 'store:main');
      }, this);
    }
  });

  ////////////////////////////////////////////////////////////
  // EmberData
  ////////////////////////////////////////////////////////////

  App.ApplicationAdapter = DS.FirebaseAdapter.extend({
    firebase: new Firebase('https://grainfarm.firebaseio.com')
  });

  //allen
  App.Product = DS.Model.extend({
    name: DS.attr('string'),
    pricePerUnit: DS.attr('number'),
    createdAt: DS.attr('number'),
    createdDate: function() {
      return moment(this.get('createdAt')).format('MMMM Do, YYYY');
    }.property('createdAt')
  });

  App.Item = DS.Model.extend({
    quantity: DS.attr('number'),
    createdAt: DS.attr('number'),
    createdDate: function() {
      return moment(this.get('createdAt')).format('MMMM Do, YYYY');
    }.property('createdAt'),
    product: DS.belongsTo('product', { async: true }),
    //order: DS.belongsTo('order', { async: true })
  });

  App.Order = DS.Model.extend({
    isShipped: DS.attr('number'),
    createdAt: DS.attr('number'),
    createdDate: function() {
      return moment(this.get('createdAt')).format('MMMM Do, YYYY');
    }.property('createdAt'),
    items: DS.hasMany('item', { async: true })
  });
  //************

  App.Post = DS.Model.extend({
    title: DS.attr('string'),
    body: DS.attr('string'),
    published: DS.attr('number'),
    publishedDate: function() {
      return moment(this.get('published')).format('MMMM Do, YYYY');
    }.property('published'),
    user: DS.belongsTo('user', { async: true }),
    comments: DS.hasMany('comment', { async: true })
  });

  App.Comment = DS.Model.extend({
    body: DS.attr('string'),
    published: DS.attr('number'),
    publishedDate: function() {
      var m = moment(this.get('published'));
      return '%@ at %@'.fmt(m.format('MMMM Do, YYYY'), m.format('h:mm:ss a'));
    }.property('published'),
    user: DS.belongsTo('user', { async: true })
  });

  App.User = DS.Model.extend({
    created: DS.attr('number'),
    username: function() {
      return this.get('id');
    }.property(),
    avatar: function() {
      return 'https://www.gravatar.com/avatar/' + md5(this.get('id')) + '.jpg?d=retro&size=80';
    }.property(),
    posts: DS.hasMany('post', { async: true })
  });

  App.RawTransform = DS.Transform.extend({
    deserialize: function(serialized) {
      return serialized;
    },
    serialize: function(deserialized) {
      return deserialized;
    }
  });

  ////////////////////////////////////////////////////////////
  // Routes
  ////////////////////////////////////////////////////////////

  App.Router.map(function() {
    this.resource('posts', { path: '/posts' }, function() {
      this.route('new');
    });
    this.resource('post', { path: '/post/:post_id' });
    this.resource('users', { path: '/users' });
    this.resource('user', { path: '/user/:user_id' });

    //allen
    this.resource('orders', { path: '/orders' });
    this.resource('products', { path: '/products' }, function() {
      this.route('new');
    });
    this.resource('product', { path: '/:product_id' });
    //************
  });


    /////////////////////////////////////////////
    // Index
    /////////////////////////////////////////////

    App.IndexRoute = Ember.Route.extend({
      redirect: function() {
        this.transitionTo('posts');
      }
    });

    /////////////////////////////////////////////
    // Orders 
    /////////////////////////////////////////////

    App.OrdersRoute = Ember.Route.extend({
      model: function() {
        return this.store.findAll('order');
      }
    });

    App.OrdersController = Ember.ArrayController.extend({
      sortProperties: ['createdAt'],
      sortAscending: false
    });


    /////////////////////////////////////////////
    // Products 
    /////////////////////////////////////////////

    App.ProductsIndexRoute = Ember.Route.extend({
      model: function() {
        return this.store.findAll('product');
      }
    });

    App.ProductsIndexController = Ember.ArrayController.extend({
      sortProperties: ['createdAt'],
      sortAscending: false
    });

    App.ProductsNewController = Ember.ObjectController.extend({
      init: function() {
        this.set('product',  Ember.Object.create());
      },
      productIsValid: function() {
        var isValid = true;
        ['product.name', 'product.pricePerUnit'].forEach(function(field) {
          if (this.get(field) === '') {
            isValid = false;
          }
        }, this);
        return isValid;
      },
      actions: {
        createProduct: function() {
          if (!this.productIsValid()) { return; }
            var newProduct = this.store.createRecord('product', {
              name: this.get('product.name'),
              pricePerUnit: this.get('product.pricePerUnit'),
              createdAt: new Date().getTime()
            });
            newProduct.save();
            this.setProperties({
              'product.name': '',
              'product.pricePerUnit': 0
            });
            //this.transitionToRoute('products', newPost);
            this.transitionToRoute('products');
        }
      },
      product: undefined
    });

    /////////////////////////////////////////////
    // Product 
    /////////////////////////////////////////////

    App.ProductRoute = Ember.Route.extend({
      model: function(params) {
        return this.store.find('product', params.product_id);
      }
    });

    App.ProductController = Ember.ObjectController.extend({
      quantity: 1,
      actions: {
        buyProduct: function() {
          var item = this.store.createRecord('item', {
            quantity: this.get('quantity'),
            created: new Date().getTime(),
            product: this.get('content') 
          });

          //item.save();
          
          var productId = this.get('content').get('id');
          var newQuantity = parseInt(this.get('quantity'));

          Ember.RSVP.hash({
            order: this.get('util').getOrder()
          }).then(function(promises) {
            //item.set('order', promises.order);
            Ember.RSVP.Promise.cast(promises.order.get('items')).then(function(items) {
              var existing = items.findBy('product.id', productId);
              if(existing){
                var quantity = parseInt(existing.get('quantity'));
                existing.set('quantity', quantity + newQuantity);
                existing.save();
              }else{
                items.addObject(item);
                promises.order.save().then(function() {}, function() {}).finally(function() {
                  item.save();
                });
              }
            });
          });

        }
      }
    });


    /////////////////////////////////////////////
    // Posts
    /////////////////////////////////////////////

    App.PostsIndexRoute = Ember.Route.extend({
      model: function() {
        return this.store.findAll('post');
      }
    });

    App.PostsIndexController = Ember.ArrayController.extend({
      sortProperties: ['published'],
      sortAscending: false
    });

    App.PostsNewController = Ember.ObjectController.extend({
      init: function() {
        this.set('post',  Ember.Object.create());
      },
      postIsValid: function() {
        var isValid = true;
        ['post.title', 'post.username', 'post.body'].forEach(function(field) {
          if (this.get(field) === '') {
            isValid = false;
          }
        }, this);
        return isValid;
      },
      actions: {
        publishPost: function() {
          if (!this.postIsValid()) { return; }
          Ember.RSVP.hash({
            user: this.get('util').getUserByUsername(this.get('post.username'))
          })
          .then(function(promises) {
            var newPost = this.store.createRecord('post', {
              title: this.get('post.title'),
              body: this.get('post.body'),
              published: new Date().getTime(),
              user: promises.user
            });
            newPost.save();
            this.setProperties({
              'post.title': '',
              'post.username': '',
              'post.body': ''
            });
            this.transitionToRoute('post', newPost);
          }.bind(this));
        }
      },
      post: undefined
    });

    /////////////////////////////////////////////
    // Post
    /////////////////////////////////////////////

    App.PostRoute = Ember.Route.extend({
      model: function(params) {
        return this.store.find('post', params.post_id);
      }
    });

    App.PostController = Ember.ObjectController.extend({
      actions: {
        publishComment: function(post, comment) {
          comment.save().then(function() {
            Promise.cast(post.get('comments')).then(function(comments) {
              comments.addObject(comment);
              post.save().then(function() {}, function() {});
            });
          });
        }
      }
    });

    ///////////////////////////////////////////////
    // Users
    ///////////////////////////////////////////////

    App.UsersRoute = Ember.Route.extend({
      model: function() {
        return this.store.findAll('user');
      }
    });

    App.UsersController = Ember.ArrayController.extend({
      sortProperties: ['firstName'],
      sortAscending: true
    });

    /////////////////////////////////////////////
    // User
    /////////////////////////////////////////////

    App.UserRoute = Ember.Route.extend({
      model: function(params) {
        return this.store.find('user', params.user_id);
      }
    });

    App.UserController = Ember.ObjectController.extend();

  ////////////////////////////////////////////////////////////
  // Components
  ////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////
    // Post
    ///////////////////////////////////////////////

    App.FirePostComponent = Ember.Component.extend({
      classNames: ['post'],
      classNameBindings: ['isExpanded:post-expanded', 'isSingle:post-single'],
      commentUsername: '',
      commentBody: '',
      commentIsValid: function() {
        var isValid = true;
        ['commentUsername', 'commentBody'].forEach(function(field) {
          if (this.get(field) === '') {
            isValid = false;
          }
        }, this);
        return isValid;
      },
      actions: {
        publishComment: function() {
          if (!this.commentIsValid()) { return; }
          var store = this.get('store');
          Ember.RSVP.hash({
            user: this.get('util').getUserByUsername(this.get('commentUsername'))
          }).then(function(promises) {
            // Create a new comment
            var comment = store.createRecord('comment', {
              body: this.get('commentBody'),
              published: new Date().getTime(),
              user: promises.user
            });
            // Tell the post about the comment
            this.sendAction('onPublishComment', this.get('post'), comment);
            // Reset the fields
            this.setProperties({
              commentUsername: '',
              commentBody: ''
            });
          }.bind(this));
        },
        removeComment: function(comment) {
          var post = this.get('post');
          Promise.cast(post.get('comments')).then(function(comments) {
            comments.removeObject(comment);
            comment.destroyRecord();
            post.save();
          });
        }
      },
    });

    App.FirePostSlugComponent = Ember.Component.extend({
      classNames: ['post-slug'],
      publishedMonth: function() {
        return moment(this.get('post.published')).format('MMM');
      }.property('post.published'),
      publishedDay: function() {
        return moment(this.get('post.published')).format('D');
      }.property('post.published')
    });

  ////////////////////////////////////////////////////////////
  // Helpers
  ////////////////////////////////////////////////////////////

  Ember.Handlebars.helper('breaklines', function(value, options) {
    var escaped = Ember.Handlebars.Utils.escapeExpression(value);
        escaped = escaped.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new Ember.Handlebars.SafeString(escaped);
  });

  Ember.Handlebars.helper('markdown', function(value, options) {
    return new Ember.Handlebars.SafeString(window.markdown.toHTML(value));
  });

})(window);