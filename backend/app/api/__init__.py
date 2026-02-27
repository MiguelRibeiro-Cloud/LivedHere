from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.assistant import router as assistant_router
from app.api.auth import router as auth_router
from app.api.geocode import router as geocode_router
from app.api.map import router as map_router
from app.api.places import router as places_router
from app.api.reports import router as reports_router
from app.api.reviews import router as reviews_router
from app.api.search import router as search_router
from app.api.user import router as user_router

router = APIRouter()
router.include_router(auth_router, tags=["auth"])
router.include_router(user_router, tags=["user"])
router.include_router(places_router, tags=["places"])
router.include_router(reviews_router, tags=["reviews"])
router.include_router(admin_router, tags=["admin"])
router.include_router(reports_router, tags=["reports"])
router.include_router(search_router, tags=["search"])
router.include_router(geocode_router, tags=["geocode"])
router.include_router(map_router, tags=["map"])
router.include_router(assistant_router, tags=["assistant"])
