class Metrics:

    def calculate(self, scan_result: dict):

        files = scan_result["files"]

        total_size = sum(
            file["size"]
            for file in files
        )

        empty_files = [
            file["path"]
            for file in files
            if file["size"] == 0
        ]

        largest_file = max(
            files,
            key=lambda x: x["size"],
            default=None,
        )

        average_size = 0

        if files:
            average_size = (
                total_size // len(files)
            )

        return {
            "summary": {
                "total_files": scan_result["total_files"],
                "total_directories": scan_result["total_directories"],
                "total_size": total_size,
            },
            "health": {
                "largest_file": largest_file,
                "empty_files": empty_files,
                "average_file_size": average_size,
            },
            "languages": scan_result["languages"],
        }