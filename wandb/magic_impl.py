from __future__ import absolute_import

import sys
import six
import argparse

import_hook = None
run_once = False
parsed_args = False

# PEP302 new import hooks, in python3 we could use importlib
class ImportMetaHook():
    def __init__(self, watch=(), on_import=None):
        if isinstance(watch, six.string_types):
            watch = tuple([watch])
        self.watch_items = frozenset(watch)
        self.modules = {}
        self.on_import = on_import

    def install(self):
        sys.meta_path.insert(0, self)
        #print('meta', sys.meta_path)

    def uninstall(self):
        sys.meta_path.remove(self)

    def find_module(self, fullname, path=None):
        #print("find", fullname, self.watch_items)
        lastname = fullname.split('.')[-1]
        if lastname in self.watch_items:
            #print("found", fullname, lastname)
            return self

    def load_module(self, fullname):
        self.uninstall()
        mod = __import__(fullname)
        self.install()
        self.modules[fullname] = mod
        #print('loaded', fullname)
        if self.on_import:
            self.on_import(fullname)
        return mod

    def get_modules(self):
        return tuple(self.modules)

    def get_module(self, module):
        return self.modules[module]


class ArgumentException(Exception):
    pass

class ArgumentParser(argparse.ArgumentParser):

    def error(self, message):
        #self.print_help(sys.stderr)
        # self.exit(2, '%s: error: %s\n' % (self.prog, message))
        raise ArgumentException()



def wandb_keras_hooks_install():
    global run_once
    global import_hook
 
    def _fit_wrapper(fn,
            generator=None, *args, **kwargs):
        import wandb
        keras = sys.modules.get("keras")
        epochs = kwargs.pop("epochs", None)
        magic_epochs = wandb.env.get_magic_epochs()
        if magic_epochs is not None:
            epochs = magic_epochs
        callbacks = kwargs.pop("callbacks", [])

        try:
            tb_callback = keras.callbacks.TensorBoard(log_dir=wandb.run.dir)
        except ImportError:
            pass
            # TODO(jhr): warning that we were unable to add tensorboard
        else:
            callbacks.append(tb_callback)

        callbacks.append(wandb.keras.WandbCallback())
        kwargs["callbacks"] = callbacks
        if epochs is not None:
            kwargs["epochs"] = epochs
        if generator:
            return fn(generator, *args, **kwargs)
        return fn(*args, **kwargs)

    # NOTE(jhr): needs to spell out all useable args so that users who inpspect can see args
    def fit(self,
            x=None,
            y=None,
            batch_size=None,
            epochs=1,
            # FIXME: there is more
            #verbose=1,
            #callbacks=None,
            #validation_split=0.,
            #validation_data=None,
            #shuffle=True,
            #class_weight=None,
            #sample_weight=None,
            #initial_epoch=0,
            #steps_per_epoch=None,
            #validation_steps=None,
            #validation_freq=1,
            #max_queue_size=10,
            #workers=1,
            #use_multiprocessing=False,
            *args, **kwargs):
        return _fit_wrapper(self._fit, x=x, y=y, batch_size=batch_size, epochs=epochs, *args, **kwargs)

    def fit_generator(self, generator,
                      steps_per_epoch=None,
                      epochs=1,
                      # FIXME: there is more
                      #verbose=1,
                      #verbose=1,
                      #callbacks=None,
                      #validation_data=None,
                      #validation_steps=None,
                      #validation_freq=1,
                      #class_weight=None,
                      #max_queue_size=10,
                      #workers=1,
                      ##use_multiprocessing=False,
                      #shuffle=True,
                      #initial_epoch=0,
                      *args, **kwargs):
        return _fit_wrapper(self._fit_generator, generator=generator, steps_per_epoch=steps_per_epoch, epochs=epochs, *args, **kwargs)

    def monkey_keras(keras=None):
        # by default we defer init until now
        # TODO: Need to be able to pass options to init?
        import wandb
        # FIXME: add magic taint
        wandb.init()

        #print("JHRDEBUG", type(keras.engine.Model), keras.engine.Model.__qualname__)
        #keras.engine.Model._fit_wrapper = _fit_wrapper
        keras.engine.Model._fit = keras.engine.Model.fit
        keras.engine.Model.fit = fit
        keras.engine.Model._fit_generator = keras.engine.Model.fit_generator
        keras.engine.Model.fit_generator = fit_generator

    def on_import(fullname):
        #print("loaded", fullname)
        if fullname == 'keras':
            keras = import_hook.get_module('keras')
            monkey_keras(keras)

    def parse_args():
        global parsed_args
        # try using argparse
        parser=ArgumentParser(add_help=False)
        for num, arg in enumerate(sys.argv):
            print('num', num, arg)
            try:
                next_arg = sys.argv[num + 1]
            except IndexError:
                next_arg = ''
            if arg.startswith(("-", "--")) and not next_arg.startswith(("-", "--")):
                try:
                    parser.add_argument(arg) 
                except ValueError:
                    print("cant")

        try:
            parsed, unknown = parser.parse_known_args()
        except ArgumentException as exc:
            pass
        else:
            print('parsed', parsed)
            print('unk', unknown)
            for k, v in six.iteritems(parsed.__dict__):
                print("got", k, v)


    def monkey_argparse():
        argparse._ArgumentParser = argparse.ArgumentParser

        def monitored(self, args, unknown=None):
            print("MON", args, unknown)

        class MonitoredArgumentParser(argparse._ArgumentParser):
            def __init__(self, *args, **kwargs):
                #self._callback = kwargs.pop("_callback", None)
                print("monitored")
                argparse.ArgumentParser = argparse._ArgumentParser
                super(MonitoredArgumentParser, self).__init__(*args, **kwargs)
                argparse.ArgumentParser = MonitoredArgumentParser
                #argparse._ArgumentParser.__init__(self, *args, **kwargs)
                #super().__init__(*args, **kwargs)

            def parse_args(self, *args, **kwargs):
                args = super(MonitoredArgumentParser, self).parse_args(*args, **kwargs)
                if self._callback:
                   self._callback(args)
                return args

            def parse_known_args(self, *args, **kwargs):
                args, unknown = super(MonitoredArgumentParser, self).parse_known_args(*args, **kwargs)
                if self._callback:
                    self._callback(args, unknown=unknown)
                return args, unknown

        argparse.ArgumentParser = MonitoredArgumentParser
        argparse.ArgumentParser._callback = monitored
        

    if not run_once:
        #print("JHRDEBUG0")
        run_once = True
        #print("magic ready")
        #print("mods", tuple(sys.modules))
        monkey_argparse()
        #parse_args()

        if 'keras' in sys.modules:
            monkey_keras(sys.modules.get('keras'))
        else:
            import_hook = ImportMetaHook(watch='keras', on_import=on_import)
            import_hook.install()
        #import keras
        #print("mods", tuple(sys.modules))
        #print("magic installed")