# Usage:
# poetry show --only main | python -m trussed.utils.pkgdump

import sys
import dataclasses
import pkg_resources


@dataclasses.dataclass(slots=True)
class PkgSummary:
    name: str = ''
    version: str = ''
    summary: str = ''
    license: str = ''

    @classmethod
    def from_pkg(cls, pkg: pkg_resources.Distribution):
        try:
            lines = pkg.get_metadata_lines('METADATA')
        except FileNotFoundError:
            lines = pkg.get_metadata_lines('PKG-INFO')

        summary = ''
        license = ''
        classified_license = ''

        for line in lines:
            if line.startswith('Summary:'):
                summary = line.split(':', 1)[1].strip()

            if line.startswith('License:'):
                license = line.split(':', 1)[1].strip()

            elif line.startswith('Classifier: License ::'):
                classified_license = line.rsplit('::', 1)[1].strip()

        return cls(
            name=pkg.project_name,
            version=pkg.version,
            summary=summary,
            license=license or classified_license or 'Unknown',
        )

    def as_csv(self):
        return f'"{self.name}", "{self.version}", "{self.license}", "{self.summary}"'


class PkgDict(dict):
    def load(self):
        for pkg in sorted(pkg_resources.working_set, key=lambda x: str(x).lower()):
            self[pkg.project_name.lower()] = PkgSummary.from_pkg(pkg)

        return self


def names_from_stdin():
    names = [i.split(maxsplit=1)[0] for i in sys.stdin.readlines()]
    return [i.strip().lower() for i in names]


def main():
    pkgmap = PkgDict().load()

    if not sys.stdin.isatty() or '-i' in sys.argv[1:]:
        names = names_from_stdin()
    else:
        names = [*pkgmap]

    for name in names:
        summary = pkgmap.get(name) or PkgSummary(name)
        print(summary.as_csv())


if __name__ == '__main__':
    main()
