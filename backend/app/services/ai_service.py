from app.ai.llm import generate_answer
from app.ai.rag import build_context


def answer_query(query: str) -> dict:
    context = build_context(query)
    answer = generate_answer(context)
    return {"query": query, "context": context, "answer": answer}
