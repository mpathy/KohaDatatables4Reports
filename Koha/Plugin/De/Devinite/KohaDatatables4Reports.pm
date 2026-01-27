package Koha::Plugin::De::Devinite::KohaDatatables4Reports;

use Modern::Perl;
use base qw(Koha::Plugins::Base);
use C4::Context;

our $VERSION = "0.0.1";

our $metadata = {
    name            => 'Reports with DataTables',
    author          => 'Markus Majer',
    date_authored   => '2026-01-21',
    date_updated    => '2026-01-27',
    minimum_version => '22.11.00.000',
    maximum_version => undef,
    version         => $VERSION,
    description     => 'Adds DataTables to Koha Reports (auto-loads all pages if < 2000 results)',
};

sub new {
    my ( $class, $args ) = @_;
    $args->{'metadata'} = $metadata;
    $args->{'metadata'}->{'class'} = $class;
    my $self = $class->SUPER::new($args);
    return $self;
}

sub install {
    my ( $self, $args ) = @_;
    return 1;
}

sub upgrade {
    my ( $self, $args ) = @_;
    return 1;
}

sub uninstall {
    my ( $self, $args ) = @_;
    return 1;
}

sub intranet_js {
    my ( $self ) = @_;
    return "<script>".read_file( abs_path( $self->mbf_path('Datatables4Reports.js') ) )."</script>";
}

sub intranet_head {
    my ( $self ) = @_;
    return "<style>".read_file( abs_path( $self->mbf_path('Datatables4Reports.css') ) )."</style>";
}

1;