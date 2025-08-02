import glob
import environs


class Env(environs.Env):
    @staticmethod
    def read_envs(recurse=False, verbose=False) -> None:
        for path in ['.env'] + sorted(glob.glob('.env.*', recursive=recurse)):
            environs.Env.read_env(path, recurse=recurse, verbose=verbose, override=True)


env = Env()

if env.bool('DOTENVS', True):
    env.read_envs(recurse=env.bool('DOTENVS_RECURSIVE', False))

