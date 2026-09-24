<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Session\ArraySessionHandler;
use Illuminate\Session\Store;

require __DIR__.'/../../../vendor/autoload.php';
$app = require_once __DIR__.'/../../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$middleware = new HandleInertiaRequests;

// 1. Stateless request (no session store)
$statelessReq = Request::create('/stateless-test', 'GET');
$statelessProps = $middleware->share($statelessReq);

$statelessUser = $statelessProps['auth']['user'];
$statelessSuccess = ($statelessProps['flash']['success'])();
$statelessError = ($statelessProps['flash']['error'])();
$statelessInfo = ($statelessProps['flash']['info'])();
$statelessWarning = ($statelessProps['flash']['warning'])();

// 2. Guest request with active session
$guestReq = Request::create('/guest-flash-test', 'GET');
$session = new Store('test', new ArraySessionHandler(60));
$session->put('success', 'Assinatura criada com sucesso!');
$session->put('error', 'Falha ao processar pagamento.');
$session->put('info', 'Lembrete de renovação.');
$session->put('warning', 'Cartão próximo da expiração.');
$guestReq->setLaravelSession($session);

$guestProps = $middleware->share($guestReq);
$guestUser = $guestProps['auth']['user'];
$guestSuccess = ($guestProps['flash']['success'])();
$guestError = ($guestProps['flash']['error'])();
$guestInfo = ($guestProps['flash']['info'])();
$guestWarning = ($guestProps['flash']['warning'])();

echo json_encode([
    'stateless' => [
        'has_session' => $statelessReq->hasSession(),
        'user_is_null' => is_null($statelessUser),
        'success' => $statelessSuccess,
        'error' => $statelessError,
        'info' => $statelessInfo,
        'warning' => $statelessWarning,
    ],
    'guest_with_session' => [
        'has_session' => $guestReq->hasSession(),
        'user_is_null' => is_null($guestUser),
        'success' => $guestSuccess,
        'error' => $guestError,
        'info' => $guestInfo,
        'warning' => $guestWarning,
    ],
]);
