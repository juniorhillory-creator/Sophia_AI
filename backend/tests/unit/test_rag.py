from uuid import uuid4

from app.infrastructure.chroma_store import ChromaStore
from app.schemas.models import INSUFFICIENT, Chunk
from app.services.rag import RagService
from tests.embedder import HashEmbedder
from tests.unit.test_summary import ScriptedLlm


def _chunk(document_id, page: int, text: str, index: int = 0) -> Chunk:
    return Chunk(
        chunk_id=f"{document_id}:{page}:{index}",
        document_id=document_id,
        page_number=page,
        index_on_page=index,
        text=text,
    )


def _rag(top_k: int = 4, min_score: float = 0.3) -> RagService:
    return RagService(HashEmbedder(), ChromaStore.memory(), top_k, min_score)


def test_retrieval_ranks_the_matching_chunk_and_keeps_top_k() -> None:
    document_id = uuid4()
    energy = _chunk(document_id, 1, "mitochondria produce cellular energy")
    cooking = _chunk(document_id, 2, "bibliography lists cooking recipes")
    rag = _rag()
    rag.index([energy, cooking])

    hits = rag.retrieve(document_id, "mitochondria cellular energy")
    assert hits
    assert hits[0].chunk_id == energy.chunk_id
    assert hits[0].page == 1
    assert hits[0].score >= 0.3
    assert all(hit.score >= 0.3 for hit in hits)

    topics = [_chunk(document_id, 1, f"alpha beta gamma topic {index}", index) for index in range(4)]
    limited = _rag(top_k=3, min_score=0.2)
    limited.index(topics)
    found = limited.retrieve(document_id, "alpha beta gamma topic")
    assert len(found) == 3
    assert {hit.chunk_id for hit in found} <= {chunk.chunk_id for chunk in topics}

    llm = ScriptedLlm(["should not run"])
    strict = _rag(min_score=0.99)
    strict.index([energy, cooking])
    missed = strict.answer(document_id, "xylophone quantum", llm, 1)
    assert missed.answer == INSUFFICIENT
    assert missed.sources == []
    assert missed.document_id == document_id
    assert llm.calls == []


def test_vector_search_stays_inside_one_document() -> None:
    alpha = uuid4()
    beta = uuid4()
    rag = _rag(min_score=0.0)
    rag.index([_chunk(alpha, 1, "mitochondria produce cellular energy")])
    rag.index([_chunk(beta, 3, "UNIQUEBETA molecule binds the site")])

    beta_hits = rag.retrieve(beta, "UNIQUEBETA molecule")
    assert beta_hits
    assert beta_hits[0].chunk_id == f"{beta}:3:0"
    assert "UNIQUEBETA" in beta_hits[0].text

    alpha_hits = rag.retrieve(alpha, "UNIQUEBETA molecule")
    assert all(hit.chunk_id.startswith(f"{alpha}:") for hit in alpha_hits)
    assert all("UNIQUEBETA" not in hit.text for hit in alpha_hits)


def test_citations_copy_page_excerpt_and_chunk_id() -> None:
    document_id = uuid4()
    chunk = _chunk(document_id, 2, "The catalyst increased yield on page two only")
    rag = _rag(min_score=0.2)
    rag.index([chunk])
    llm = ScriptedLlm(["It increased. See page 99.", INSUFFICIENT])

    answered = rag.answer(document_id, "catalyst increased yield", llm, 5)
    assert answered.answer == "It increased. See page 99."
    assert answered.document_id == document_id
    assert len(answered.sources) == 1
    source = answered.sources[0]
    assert source.page == 2
    assert source.chunk_id == chunk.chunk_id
    assert source.excerpt == chunk.text
    assert "page 99" not in source.excerpt
    user = llm.calls[0]["messages"][1]["content"]
    system = llm.calls[0]["messages"][0]["content"]
    assert chunk.text in user
    assert INSUFFICIENT in system

    empty = rag.answer(document_id, "catalyst increased yield", llm, 5)
    assert empty.answer == INSUFFICIENT
    assert empty.sources == []
