from dataclasses import dataclass, field
from typing import List, Optional


# -----------------------------
# Common Models
# -----------------------------

@dataclass
class ImportSymbol:
    module: str
    alias: Optional[str] = None
    line: int = 0


@dataclass
class DecoratorSymbol:
    name: str
    line: int = 0


# -----------------------------
# Function / Method
# -----------------------------

@dataclass
class FunctionSymbol:
    name: str
    start_line: int
    end_line: int

    async_function: bool = False

    decorators: List[DecoratorSymbol] = field(default_factory=list)


@dataclass
class MethodSymbol(FunctionSymbol):
    class_name: str = ""


# -----------------------------
# Class
# -----------------------------

@dataclass
class ClassSymbol:
    name: str

    start_line: int

    end_line: int

    methods: List[MethodSymbol] = field(default_factory=list)

    decorators: List[DecoratorSymbol] = field(default_factory=list)


# -----------------------------
# File
# -----------------------------

@dataclass
class FileSymbols:

    path: str

    language: str

    imports: List[ImportSymbol] = field(default_factory=list)

    classes: List[ClassSymbol] = field(default_factory=list)

    functions: List[FunctionSymbol] = field(default_factory=list)

    async_functions: List[FunctionSymbol] = field(default_factory=list)

    decorators: List[DecoratorSymbol] = field(default_factory=list)


# -----------------------------
# Project
# -----------------------------

@dataclass
class ProjectSymbols:

    project_id: str

    files: List[FileSymbols] = field(default_factory=list)