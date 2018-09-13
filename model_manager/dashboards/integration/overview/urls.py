from django.conf.urls import patterns
from django.conf.urls import url
from model_manager.dashboards.integration.overview import views


urlpatterns = patterns(
    '',
    url(r'^$', views.IndexView.as_view(), name='index'),
    url(r'^status', views.StatusView.as_view(), name='status'),
)
